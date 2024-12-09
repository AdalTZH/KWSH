import os
import mysql.connector
from docx import Document

from langchain_community.document_loaders import WebBaseLoader
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_community.chat_models import ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_cohere import CohereEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_cohere import CohereRerank
from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
from langchain.docstore.document import Document as Langchain_Doc

os.environ["COHERE_API_KEY"] = "XL0l1cfNDXPI4DFQf19IDQFy84hdeTZ3HSOVmnhs"
os.environ["LANGCHAIN_TRACING_V2"]="true"
os.environ["LANGCHAIN_ENDPOINT"]="https://api.smith.langchain.com"
os.environ["LANGCHAIN_API_KEY"]="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"
os.environ["LANGCHAIN_PROJECT"]="KWSH"


class FAQ_Documents:
    def __init__(self, CTI, QueenBee):
        # you can put here some validation logic
        self.CTI = CTI
        self.QueenBee = QueenBee


print("Loading Agents ...")
llm = ChatOllama(model="llama3", format="json", temperature=0)
generation_llm = ChatOllama(model="llama3", temperature=0.9)
print("Agents loaded successfully")
print("Loading langchain doc")
def process_word_doc(file_name, source, url):
    doc = Document(file_name)
    content = ""
    for para in doc.paragraphs:
        if len(para.text) > 0:
            content += para.text
    return Langchain_Doc(page_content=content, metadata={"source": url})

# List of documents with corresponding URLs
document_urls = {
    "CompletedMentorshipProjects": "https://cti.kwsh.org.sg/completed-mentorship-projects/",
    "ConferencesAndSeminars": "https://cti.kwsh.org.sg/conferences-and-seminars/",
    "ContactUs": "https://cti.kwsh.org.sg/contact-us/",
    "Courses": "https://cti.kwsh.org.sg/courses/",
    "Homepage": "https://cti.kwsh.org.sg/",
    "LeanThinking": "https://cti.kwsh.org.sg/lean-thinking/",
    "MentorshipSupport": "https://cti.kwsh.org.sg/mentorship-support/",
    "NewsAndMedia": "https://cti.kwsh.org.sg/news-and-media/",
    "OurFacilities": "https://cti.kwsh.org.sg/our-facilities/",
    "OurMilestones": "https://cti.kwsh.org.sg/our-milestones/",
    "OurPartners": "https://cti.kwsh.org.sg/our-partners/",
    "OurVision": "https://cti.kwsh.org.sg/our-vision/",
    "QueenBeeCourses": "https://cti.kwsh.org.sg/queen-bee-courses/",
    "SkillsFutureQueenBee": "https://cti.kwsh.org.sg/skillsfuture-queen-bee/",
    "SmartWard": "https://cti.kwsh.org.sg/smart-ward/",
    "WorkplaceLearning": "https://cti.kwsh.org.sg/workplace-learning/"
}

# Process each document
docs = [process_word_doc(f'./Prescraped/{doc}.docx', doc.replace('_', ' '), url) 
                  for doc, url in document_urls.items()]
flattened_docs = []
for doc in docs:
    if isinstance(doc, list):
        flattened_docs.extend(doc)
    elif doc is not None:
        flattened_docs.append(doc)

print("Formatting Information ...")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=150)
doc_splits = text_splitter.split_documents(flattened_docs)
print("Documents Successfully Formatted")
print("Saving to ChromaDB ...")
vectorstore = Chroma.from_documents(
    documents=doc_splits,
    collection_name="rg-chroma",
    embedding= CohereEmbeddings(model="embed-english-v3.0")
)
print("ChromaDB successfully saved")
retriever = vectorstore.as_retriever(search_kwargs={"k": 15})
print("Retriever successfully configured")


def reranked_document(query):
    print("Retrieving related documents ...")
    compressor = CohereRerank(model="rerank-english-v3.0")
    compression_retriever = ContextualCompressionRetriever(base_compressor=compressor, base_retriever=retriever)
    print("Reranking Documents")
    compressed_docs = compression_retriever.invoke(query)
    print("Reranking Completed")
    return compressed_docs

def grade_documents(compressed_docs, query):

    docs_grading_template="""system You are a grader assessing relevance 
    of a retrieved document to a user question. If the document contains keywords related to the user question, 
    grade it as relevant. It does not need to be a stringent test. The goal is to filter out erroneous retrievals. \n
    Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question. \n
    Provide the binary score as a JSON with a single key 'score' and no preamble or explanation.
    user
    Here is the retrieved document: \n\n {document} \n\n
    Here is the user question: {question} \n assistant
    """
    docs_grading_prompt = ChatPromptTemplate.from_template(docs_grading_template)

    document_grader_chain = ( docs_grading_prompt | llm | JsonOutputParser())
    print("Grading Documents ...")
    document_grade = document_grader_chain.invoke({"document": compressed_docs, "question": query})
    print("Grading Completed")

    return document_grade

def generate_answer(context, query):
    generation_template = """
    system
    You are KACA, a knowledgeable Enquiry Chatbot for Kwong Wai Shiu Hospital Community Training Institute (KWSH CTI).
    You provide visitors with accurate and detailed information about our institute's services, courses, and related information. 
    Answer visitors with a clear and precise answer to their questions, and provide any relevant details that might be useful for the visitor. 
    Include links for more information if available. 
    If the enquiry is complex or specific, refer the visitor to the relevant contact within the institute. Avoid generic responses and without preamble.

    response_structure
    1. Greet the visitor back if they greeted you.
    2. Thank the visitor.
    3. Provide a concise and accurate answer.
    4. Include any relevant details or links for further information.
    5. Provide contact details relevant to the enquiry.

    contact_details
    For General Enquiry (Email: CTI@kwsh.org.sg, Tel: +65 6422 1200) 0
    For CTI Training Courses Enquiry (Email: CTI@kwsh.org.sg, Tel: +65 6422 1300) 
    For SkillsFuture Queen Bee Related/Queen Bee Courses/Mentorship Support Enquiry (Email: QB@kwsh.org.sg Tel: +65 6422 1275)

    error_handling
    If the information is not available, apologize and provide an alternative method for the visitor to get in touch with the institute.

    personalization
    Try to personalize the response based on the visitor's enquiry to make the interaction more engaging.

    user
    Answer the question based only on the following context: {context}

    Here is the visitor's question: {question}

    
    Example 1:
    context: "We offer a wide range of courses in healthcare, including Basic Caregiving, Nursing, and Elderly Care."
    question: "What courses do you offer related to healthcare?"
    response:
    Thank you for reaching out to us.
    We offer a wide range of courses in healthcare, including Basic Caregiving, Nursing, and Elderly Care.
    For more information on our courses, please visit our website: https://cti.kwsh.org.sg/courses/
    For any further enquiries, you can contact us at CTI@kwsh.org.sg or call +65 6422 1300.

    Example 2:
    context: "SkillsFuture Queen Bee refers to industry leaders/anchor organisations that attract and influence other companies (in particular SMEs), to scale up employer-initiated skills development efforts and help extend the reach of the SkillsFuture movement. "
    question: "Can you tell me about the SkillsFuture Queen Bee initiative?"
    response:
    Hi there!
    Thank you for your interest in SkillsFuture Queen Bee.
    Our SkillsFuture Queen Bee initiative at Kwong Wai Shiu Hospital (KWSH) is designed to enhance skills and improve care standards in the community care sector. 
    You can learn more about this initiative on our website: https://cti.kwsh.org.sg/skillsfuture-queen-bee/
    For detailed information or specific queries, please contact QB@kwsh.org.sg or call +65 6422 1275.
    """

    generation_prompt = ChatPromptTemplate.from_template(generation_template)
    gen_chain = ( generation_prompt | generation_llm | StrOutputParser())
    print("Generating Response ...")
    generation = gen_chain.invoke({"context": context, "question": query})
    print("Response Generated")
    return generation


def grade_answer(generation, query):
    grade_answer_template="""system You are a grader assessing whether an 
    answer is useful to resolve a question. Give a binary score 'yes' or 'no' to indicate whether the answer is 
    useful to resolve a question. Provide the binary score as a JSON with a single key 'score' and no preamble or explanation.
    user Here is the answer:
    \n ------- \n
    {generation} 
    \n ------- \n
    Here is the question: {question} assistant"""

    grade_answer_prompt = ChatPromptTemplate.from_template(grade_answer_template)
    grade_answer_chain = ( grade_answer_prompt | llm | JsonOutputParser())
    print("Checking response relevance ...")
    answer_grade = grade_answer_chain.invoke({"generation": generation, "question": query})
    
    return answer_grade

def check_hallucination(compressed_docs, generation):
    check_hallucination_template=""" system You are a grader assessing whether 
    an answer is grounded in / supported by a set of facts. Give a binary 'yes' or 'no' score to indicate 
    whether the answer is grounded in / supported by a set of facts. Provide the binary score as a JSON with a 
    single key 'score' and no preamble or explanation. user
    Here are the facts:
    \n ------- \n
    {documents} 
    \n ------- \n
    Here is the answer: {generation}  assistant"""
    check_hallucination_prompt = ChatPromptTemplate.from_template(check_hallucination_template)
    check_hallucination_chain = ( check_hallucination_prompt | llm | JsonOutputParser())
    print("Checking Hallucination ...")
    hallucination_grade = check_hallucination_chain.invoke({"documents": compressed_docs, "generation": generation})
    return hallucination_grade

def check_score(data):
    return data.get('score') == 'yes'


query = input("Enter Question:")
if not query.strip():
        generation = "Please provide me with a valid question. Thank you!"
else:
    generation = ""
    unchecked_generation = ""
    document_grade = {}
    answer_grade = {}
    hallucination_grade = {}
    generation_attempts = 0
    empty_context = """
                Kwong Wai Shiu Hospital (KWSH) Community Training Institute (CTI) is a 
                designated Learning Institute by the Agency for Integrated Care (AIC) that 
                offers around 100 hands-on training courses in both clinical and non-clinical areas 
                for the community care sector, such as nursing, care support, healthcare innovations, 
                and leadership training. Kwong Wai Shiu Hospital (KWSH) is also a key anchor provider in the 
                Kallang-Whampoa community, and had set up the Community Training Institute (CTI) in 
                September 2018 to spearhead innovation and workplace improvement and offer contextualised 
                training programmes to Community Care Organisations (CCOs) to support the rapidly aging Singapore 
                population and transform the community care sector. KWSH partnered with SkillsFuture Queen Bee to help 
                other organizations in this sector to adopt technology and innovation, enhancing employee skills and develop
                talents.
                """

    answerAvailable = 0
    queryRelevant = 0
    answerRelevant = 0
    answerNotRelevant = 0
    Hallucination = 0
    noHallucination = 0

    # Retrieve and grade documents
    compressed_docs = reranked_document(query)
    document_grade = grade_documents(compressed_docs, query)
    print(document_grade)
    if check_score(document_grade):
            queryRelevant += 1
            while generation_attempts != 2:
                unchecked_generation = generate_answer(compressed_docs, query)
                answer_grade = grade_answer(unchecked_generation, query)
                print(answer_grade)
                hallucination_grade = check_hallucination(compressed_docs, unchecked_generation)
                print(hallucination_grade)
                if check_score(answer_grade) and check_score(hallucination_grade):
                    if generation_attempts == 0:
                        noHallucination += 1
                        answerRelevant += 1
                        generation = unchecked_generation
                        generation_attempts = 2
                        answerAvailable += 1  
                elif generation_attempts == 1:
                    generation_attempts += 1
                    generation = generate_answer(empty_context, query)
                    if check_score(answer_grade) == "False":
                        answerNotRelevant += 1
                    elif check_score(hallucination_grade) == "False":
                        Hallucination += 1
                else:
                    generation_attempts += 1
                    if check_score(answer_grade) == "False":
                        answerNotRelevant += 1
                    elif check_score(hallucination_grade) == "False":
                        Hallucination += 1
    else:
        generation = generate_answer(empty_context, query)



