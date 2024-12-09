import logging
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import re
import calendar
from sqlalchemy import create_engine
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

llm = ChatOllama(model="llama3", temperature=0.9)

# Database connection details
db_url = "mysql+pymysql://root:@localhost:3306/FYP"
engine = create_engine(db_url)

def split_text(text):
    pattern = re.compile(r'(?<=:)(?=\s[A-Z0-9])')
    lines = pattern.split(text)
    lines = [line.strip() for line in lines]
    return lines

def generate_report(year):
   
    query = """
    SELECT 
        SUM(Ishelpful)/(SUM(Ishelpful) + SUM(Nothelpful)) as averageSatisfaction,
        SUM(gotLiveSession) / COUNT(*) as escalationRate,
        SUM(Hallucination) / SUM(queryRelevant) as hallucinationRate,
        SUM(answerRelevant) / SUM(queryRelevant) as generationEfficiency,
        SUM(answerNotRelevant) / SUM(queryRelevant) as irrelevantGenerationRate,
        SUM(NoOfQuery) / COUNT(*) as averageQueryPerVisitor,
        SUM(answerAvailable) / SUM(NoOfQuery) as answerRate,
        SUM(generationTime) / SUM(NoOfQuery) as generationTime,
        dateTime
    FROM 
        chat
    WHERE 
        YEAR(dateTime) = {}
    GROUP BY 
        MONTH(dateTime)
    """.format(year)
    
    df = pd.read_sql(query, engine)
    df['dateTime'] = pd.to_datetime(df['dateTime'])
    df['month'] = df['dateTime'].dt.month

    summary = df.groupby('month').agg({
        'averageSatisfaction': 'mean',
        'escalationRate': 'mean',
        'hallucinationRate': 'mean',
        'generationEfficiency': 'mean',
        'irrelevantGenerationRate': 'mean',
        'averageQueryPerVisitor': 'mean',
        'answerRate': 'mean',
        'generationTime': 'mean'
    }).reset_index()

    summary['month'] = summary['month'].map(lambda x: calendar.month_name[x][:3])
    for col in summary.columns[1:]:
        summary[col] = summary[col].map(lambda x: round(x, 2))

    data = summary.to_string(index=False)

    generation_template = """
    You are an expert data analyst. The following data represents the monthly performance metrics of a chatbot over a year. Each row contains data for one month, and each column represents a specific performance metric.

    The metrics are:
    - Average Satisfaction: The average satisfaction rate of the users.
    - Escalation Rate: The rate at which user queries are escalated to live sessions.
    - Hallucination Rate: The rate of false or misleading information provided by the chatbot.
    - Generation Efficiency: The efficiency of generating relevant answers.
    - Irrelevant Generation Rate: The rate of irrelevant answers generated.
    - Average Query Per Visitor: The average number of queries per visitor.
    - Answer Rate: The rate of queries that were answered by the chatbot.
    - Generation Time: The average time taken to generate a response (in seconds).

    Please provide a summary of the chatbot's performance for the year based on this data without preamble, limited to a maximum of 200 words. Don't format the analysis, only include the summary. Points to include:
    1. A brief overview of overall performance.
    2. Key highlights for any notable trends or variations.

    Here is the data: {data}
    """

    generation_prompt = ChatPromptTemplate.from_template(generation_template)
    gen_chain = (generation_prompt | llm | StrOutputParser())
    
    # Debug: Log the prompt and data
    logging.debug(f"Generated prompt: {generation_prompt.format(data=data)}")
    logging.debug(f"Data passed to LLM: {data}")

    try:
        llm_response = gen_chain.invoke({"data": data})
        logging.debug(f"LLM response: {llm_response}")
    except Exception as e:
        logging.error(f"Error invoking LLM: {e}")   
        llm_response = "Failed to generate summary due to an error."

    table_data = [["Mth", "Satisfaction", "Escalation", "Hallucination",
                   "Gen Efficiency", "Irrelevant Gen", "Avg Query/Visitor",
                   "Answer Rate", "Avg Gen Time (s)"]]
    table_data += summary.values.tolist()

    elements = []
    style = getSampleStyleSheet()
    title = f"Chatbot Monthly Performance Report - {year}"
    elements.append(Paragraph(title, style['Title']))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph("Monthly Chatbot Performance Data:", style["h3"]))

    table_styles = [
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]

    mytable = Table(table_data)
    mytable.setStyle(TableStyle(table_styles))
    elements.append(mytable)
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph("Data Analysis", style["h3"]))
    elements.append(Paragraph(llm_response))

    def plot_and_save(summary, column, ylabel, title, filename, chart_type='bar'):
        fig, ax = plt.subplots()
        if chart_type == 'line':
            ax.plot(summary['month'], summary[column], marker='o')
            ax.set_xlabel('Month')
            ax.set_ylabel(ylabel)
            ax.set_title(title)
        else:  # Default to bar chart
            ax.bar(summary['month'], summary[column])
            ax.set_xlabel('Month')
            ax.set_ylabel(ylabel)
            ax.set_title(title)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(filename)
        plt.close()

    metrics = {
        'averageSatisfaction': ('Satisfaction', 'Satisfaction Rate by Month', f'satisfactionRatePlot_{year}.png', 'line'),
        'escalationRate': ('Escalation', 'Escalation Rate by Month', f'escalationRatePlot_{year}.png', 'line'),
        'hallucinationRate': ('Hallucination', 'Hallucination Rate by Month', f'hallucinationRatePlot_{year}.png', 'line'),
        'generationEfficiency': ('Gen Efficiency', 'Generation Efficiency by Month', f'generationEfficiencyPlot_{year}.png', 'line'),
        'irrelevantGenerationRate': ('Irrelevant Gen', 'Irrelevant Generation Rate by Month', f'irrelevantGenerationRatePlot_{year}.png', 'line'),
        'averageQueryPerVisitor': ('Avg Query/Visitor', 'Average Query Per Visitor by Month', f'averageQueryPerVisitorPlot_{year}.png', 'bar'),
        'answerRate': ('Answer Rate', 'Answer Rate by Month', f'answerRatePlot_{year}.png', 'line'),
        'generationTime': ('Avg Gen Time (s)', 'Average Generation Time by Month', f'generationTimePlot_{year}.png', 'bar')
    }

    for column, (ylabel, title, filename, chart_type) in metrics.items():
        plot_and_save(summary, column, ylabel, title, filename, chart_type)
        elements.append(Paragraph(f"{title}:", style["h3"]))
        elements.append(Image(filename, 6*inch, 4*inch))
        elements.append(Spacer(1, 0.2*inch))

    doc = SimpleDocTemplate(
        f"Chatbot_Performance_Report_{year}.pdf",
        pagesize=A4,
        topMargin=30,
        bottomMargin=30
    )

    doc.build(elements)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python Generate-Test.py <year>")
        sys.exit(1)
    
    year = sys.argv[1]
    generate_report(year)