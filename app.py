from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from deep_translator import GoogleTranslator
import mysql.connector
from datetime import datetime, timedelta
import time
import mysql.connector
from langchain.schema import Document
import RAG

app = Flask(__name__)
app.secret_key = "supersecretkey"

session_timeout = timedelta(seconds=60)

# Database configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '',
    'database': 'FYP'
}

# Function to get a connection to the database
def get_db_connection():
    return mysql.connector.connect(
        host=db_config['host'],
        user=db_config['user'],
        password=db_config['password'],
        database=db_config['database']
    )

# Make session permanent and set lifetime
def make_session_permanent():
    session.permanent = True
    app.permanent_session_lifetime = timedelta(minutes=5)

# Check for session timeout
def check_session_timeout():
    now=datetime.now()
    if 'last_activity' in session:
        last_activity = session["last_activity"]
        if now - last_activity > session_timeout:
            session['unanswered_queries'] = []
    session['last_activity'] = now

# Route for home page
@app.get("/")
def index_get():
    session['start_time'] = datetime.now()
    session['last_activity'] = datetime.now()
    session['unanswered_queries'] = []
    return render_template("base.html")

# Route for live session page
@app.route("/live_session")
def live_session():
    chat_id= session['current_chat_id'] 
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE Chat SET gotLiveSession = %s WHERE ChatID = %s",(True,chat_id))
    cursor.execute("INSERT INTO livesession (Date) VALUES (%s)", (datetime.now(),))
    conn.commit()
    livesession_id = cursor.lastrowid
    chat_id= session['current_chat_id'] 
    cursor.close()
    conn.close()
    
    return render_template("live_session.html", livesession_id=livesession_id)

# Route for processing predictions
@app.post("/predict")
def predict():
    data = request.get_json()
    text = data.get("message")
    chat_id = data.get("chatId")
    lang = data.get("language")
    showFeedback = True
    print("the language is "+lang)
    translation = GoogleTranslator(source=lang, target='en').translate(text)
    print("translation done")
    query = translation
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

        start_time = time.time()
        answerAvailable = 0
        queryRelevant = 0
        answerRelevant = 0
        answerNotRelevant = 0
        Hallucination = 0
        noHallucination = 0

        # Retrieve and grade documents
        compressed_docs = RAG.reranked_document(query)
        document_grade = RAG.grade_documents(compressed_docs, query)
        print(document_grade)
        if RAG.check_score(document_grade):
                queryRelevant += 1
                while generation_attempts != 2:
                    unchecked_generation = RAG.generate_answer(compressed_docs, query)
                    answer_grade = RAG.grade_answer(unchecked_generation, query)
                    print(answer_grade)
                    hallucination_grade = RAG.check_hallucination(compressed_docs, unchecked_generation)
                    print(hallucination_grade)
                    if RAG.check_score(answer_grade) and RAG.check_score(hallucination_grade):
                        if generation_attempts == 0:
                            noHallucination += 1
                            answerRelevant += 1
                        generation = unchecked_generation
                        generation_attempts = 2
                        answerAvailable += 1  
                    elif generation_attempts == 1:
                        generation_attempts += 1
                        generation = RAG.generate_answer(empty_context, query)
                        if RAG.check_score(answer_grade) == "False":
                            answerNotRelevant += 1
                        elif RAG.check_score(hallucination_grade) == "False":
                            Hallucination += 1
                    else:
                        generation_attempts += 1
                        if RAG.check_score(answer_grade) == "False":
                            answerNotRelevant += 1
                        elif RAG.check_score(hallucination_grade) == "False":
                            Hallucination += 1
        else:
            generation = RAG.generate_answer(empty_context, query)

        generation_time = time.time() - start_time

    translation_back = GoogleTranslator(source='en', target=lang).translate(generation)
    print("translate back")
    print("The answer available: "+ str(answerAvailable))
    print("The query relevant: "+ str(queryRelevant))
    print("The answer relevant: "+ str(answerRelevant))
    print("The answer not relevant: "+ str(answerNotRelevant))
    print("The hallucination: "+ str(Hallucination))
    print("The not hullucination: "+str(noHallucination))
    
    # Save or update chat data
    if chat_id is None:
        chat_id = save_chat_data(1, datetime.now(),0, 0, generation_time, queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,noHallucination, False, 1)
        session['current_chat_id'] = chat_id
    else:
        update_chat_data(chat_id, generation_time,queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,noHallucination)

    # Store unanswered query if applicable
    if answerAvailable != 1:
        store_unanswered_query(text, chat_id)
        

    message = {"answer": translation_back, "chatId": chat_id, "showFeedback": showFeedback}
    return jsonify(message)

# Function to save chat data
def save_chat_data(NoOfQuery,date,Ishelpful, Nothelpful, generation_time,queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,noHallucination,gotLiveSession,chatbotid):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO Chat (NoOfQuery, dateTime,Ishelpful, Nothelpful,generationTime,queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,NoHallucination,gotLiveSession,ChatbotID) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        ( NoOfQuery,date,Ishelpful, Nothelpful,generation_time,queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,noHallucination,gotLiveSession,chatbotid)
    )
    chat_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return chat_id

# Function to update chat data
def update_chat_data(chat_id, generation_time,queryRelevant, answerAvailable, answerRelevant,answerNotRelevant,Hallucination,noHallucination):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE Chat 
    SET NoOfQuery = NoOfQuery + 1, 
        generationTime = ADDTIME(generationTime, %s), 
        queryRelevant = queryRelevant + %s, 
        answerAvailable = answerAvailable + %s,
        answerRelevant = answerRelevant + %s,
        answerNotRelevant = answerNotRelevant + %s,
        Hallucination = Hallucination + %s,
        NoHallucination = NoHallucination + %s 
    WHERE ChatID = %s
        """,
        ( generation_time,
         queryRelevant, 
         answerAvailable, 
         answerRelevant,
         answerNotRelevant,
         Hallucination,
         noHallucination,
         chat_id
         ))
    conn.commit()
    cursor.close()
    conn.close()

# Function to store unanswered queries
def store_unanswered_query(unansweredquery, chat_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Update the `UnansweredQueries` table
    cursor.execute(
        "INSERT INTO unansweredqueries(UnansweredQuery, ChatID) VALUES(%s, %s)",
        (unansweredquery, chat_id)
    )

    conn.commit()
    cursor.close()
    conn.close()

# Route for feedback submission for the chatbot
@app.post("/feedback")
def feedback():
    data = request.get_json()
    chat_id = data.get("chatId")
    is_helpful = data.get("isHelpful")

    if chat_id is not None and is_helpful is not None:
        conn = get_db_connection()
        cursor = conn.cursor()
        if is_helpful:
            cursor.execute("UPDATE chat SET Ishelpful = IFNULL(Ishelpful, 0) + 1 WHERE ChatID = %s", (chat_id,))
        else:
            cursor.execute("UPDATE chat SET Nothelpful = IFNULL(Nothelpful, 0) + 1 WHERE ChatID = %s", (chat_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "showFeedback": False})
    else:
        return jsonify({"status": "error", "message": "Invalid data"}), 400

# Route for submitting live session feedback
@app.route("/submit_feedback", methods=["POST"])
def submit_feedback():
    rating = request.form.get("rating")
    comment = request.form.get("comment")
    email = request.form.get("email")
    livesession_id = request.form.get("livesession_id")
    print("the id is:"+livesession_id)
    print("the rating is:"+rating)
    print("the comment is:"+comment)
    if rating and comment and livesession_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE livesession SET Rating = %s, Comment = %s, Email = %s WHERE LiveSession_id = %s",
            (rating, comment, email, livesession_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return redirect(url_for("feedback_success"))
    else:
        return "Error: Rating, Comment, and LiveSession ID are required", 400

# Route for feedback success page for the live session
@app.route("/feedback_success")
def feedback_success():
    return render_template("feedback_success.html")

if __name__ == "__main__":
    app.run()