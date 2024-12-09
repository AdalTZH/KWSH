# Kwong Wai Shiu Hospital Community Training Institute Artificial Intelligence Chatbot

## Introduction
This project addresses the issue of visitors receiving delayed responses to their inquiries on the Kwong Wai Shiu Hospital (KWSH) Community Training Institute (CTI) website. By developing a Generative AI Chatbot, we aim to eliminate the need for human intervention for common questions while maintaining high visitor satisfaction, reducing labor costs, and streamlining the team's workload.

The chatbot will automatically address visitor inquiries and, for complex issues, route them to the relevant contact rather than generic contact details. Despite having no budget and limited resources, the project implements Large Language Models (LLMs), Live Chat Redirection, a User-Friendly Chatbot GUI, and an Admin Interface to provide an efficient solution.

### Key Results
A functional generative AI chatbot with a user-friendly interface.
Features like live chat redirection and admin capabilities for CRUD operations and performance monitoring.
Ensures scalability for future enhancements.
Project Specification and Plan
System Description and Purpose

The current KWSH CTI website provides email and phone contacts for inquiries, which may result in delayed responses due to manpower shortages. This chatbot will:

Automatically address visitors’ inquiries.
Route complex issues to the relevant staff contacts.
Enable live chat functionality for complex scenarios.
Project Motivation
To enhance the responsiveness and efficiency of the KWSH CTI team in handling visitor inquiries.

### Project Benefits
Faster response times.
Reduced workload for the team.
Effective routing of complex inquiries to relevant staff.
Improved visitor satisfaction through quick and accurate responses.
Project Scope
Develop a chatbot that:
Responds to common inquiries.
Refers visitors to relevant web pages or contact details.
Routes complex inquiries to staff.
Supports live chat for complex issues.

## Functional Requirements

### Core Features
**Automated Response System**
The chatbot should automatically respond to common visitor inquiries.

**Live Chat Redirection**
For inquiries the chatbot cannot address, it should redirect the visitor to a live chat agent.

**Web Page Redirection**
The chatbot should provide links to relevant web pages for additional information.

**User-Friendly Interface**
The chatbot must have a simple, accessible interface for visitors.

**Contact Details**
Provide specific contact information, such as email and phone, for complex inquiries.

**Admin Interface Features**
Dashboard: View key metrics and recent activities.
Analytics: Generate reports and analyze performance.
FAQ Database Management (CRUD): Add, update, and delete FAQs.
Unanswered Queries: Review and manage unanswered queries.
Live Chat Feedback: View and delete feedback.
Settings: Add new admins and manage passwords.
Performance Reports: Generate and access yearly reports in PDF format.

## System Design and Implementation

### System Architecture
Section Explanation: This subsection describes the interaction between the different hardware. At the same time, it will describe the network topology that will be used by the system.

### Chatbot Model
The chatbot uses a Retrieval-Augmented Generation (RAG) framework, which combines retrieval-based and generative methods for accurate and contextually relevant responses. It processes user queries, generates responses based on retrieved information, and evaluates the relevance and accuracy of the responses.


### Live Session Integration
The live session feature enables users to interact with a human agent when the chatbot cannot resolve their queries. The system tracks user sessions, initiates live sessions as needed, and updates the database to reflect the status of these sessions. 


### Chatbot GUI
The chatbot's graphical user interface (GUI) is designed for a seamless user experience, built using HTML (refer to Appendix C), CSS, and JavaScript, and rendered by the Flask server. Users can type queries, and  view responses


### Admin Login Page
The admin login page includes a user-friendly login form designed to grant access to the admin interface. Users must enter their credentials, such as a username and password, to authenticate and gain entry to the system. This secure gateway ensures that only authorized personnel can manage and monitor the administrative functions of the platform.


### Admin Interface
The admin interface includes a Dashboard for viewing key metrics and recent activities, an Analytics feature for performance insights, generating reports, a FAQ Database with CRUD operations for managing FAQs, an Unanswered Queries feature for reviewing queries not adequately answered by the chatbot, a Live Chat feature for viewing and deleting feedback, and Settings for adding new admins and changing passwords. It offers an efficient overview and control over various aspects of the chatbot system.
Refer to Appendix D

### FAQ Implementation
The chatbot retrieves FAQ data from the KWSH CTI database and formats it into LangChain documents. This process involves gathering FAQs, retrieving data from the database, and formatting it into documents categorized by source. This allows the chatbot to efficiently respond to user queries based on the most relevant information.
Refer to Appendix E(i) for gather FAQ from KWSH CTI Website.
Refer to Appendix E(ii) for detailed code implementation of the FAQ feature.

## Entity Relationship Diagram (ERD)
![image](https://github.com/user-attachments/assets/e3f73363-7b35-478a-8495-5f90962f162a)

## Flow Chart
![image](https://github.com/user-attachments/assets/4ca166e3-6d2c-49f9-8d79-6bc114964180)

## RAG Lite Version Flowchart
![image](https://github.com/user-attachments/assets/55d3740b-64a4-455c-9ca7-46838082e7c1)

## RAG Full Version Flowchart
![image](https://github.com/user-attachments/assets/01d70e50-245a-426c-aaf0-8849a28043b4)

# Conclusions
We successfully developed the AI chatbot for the Kwong Wai Shiu Hospital Community Training Institute website to overcome the obstacle of delayed responses to visitor enquiries. By implementing the generative AI solution, we reduced staff workload, and enhanced visitor’s experience and satisfaction. Some accomplishments include integrating a functional generative chatbot with large language models to address frequently asked questions and redirects complex inquiries to relevant contacts. We developed a user-friendly design with the ability to translate, offering speech-to-text feature and enabled live chat redirection for better customer support. An admin interface was integrated with CRUD operations for Frequently Asked Questions and monitoring Chatbot performance. Despite constraints, we were able to utilize free tools and open-source resources. Some problems we faced were the Large Language Model (LLM) hallucinating and providing false information which is crucial as it might mislead visitors. We tried to address the issue with the Retrieval Augmented Generation framework, it decreased the probability of the LLM hallucinating, however, we could not eliminate the issue totally. Some future work that can be done are usage of a stronger model or implementation of a better framework in the future that can eliminate this issue to make the Chatbot more reliable.

