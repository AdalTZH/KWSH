class Chatbox {
    constructor() {
        // Initialize elements and variables
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            sendButton: document.querySelector('.send__button'),
            micButton: document.querySelector('.mic__button')
        };
        this.state = false;
        this.messages = [];
        this.responseCount = 0;
        this.recognition = null;
        this.currentChatId = null;
        this.startTime = null;
        this.inactivityTimeout = 90000; // 90 seconds
        this.inactivityTimer = null;
        this.language = 'en'; // Default language
        this.firstAnswerGenerated = false;
        this.feedbackSent = {}; // Store feedback status by message index
    }

    // Method to set up event listeners and initialize components
    display() {
        const { openButton, chatBox, sendButton, micButton } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox));
        sendButton.addEventListener('click', () => this.onSendButton(chatBox));
        micButton.addEventListener('click', () => this.onMicButton(chatBox));

        const node = chatBox.querySelector('input');
        node.addEventListener('input', () => this.toggleButtons(node.value));
        node.addEventListener('keyup', ({ key }) => {
            if (key === "Enter" && this.args.sendButton.disabled == false) {
                this.onSendButton(chatBox);
            }
        });

        this.setupSpeechRecognition();
        document.addEventListener('keypress', () => this.resetInactivityTimer());

        const languageSelect = document.getElementById('language-select');
        languageSelect.addEventListener('change', (event) => {
            this.language = event.target.value;
            console.log('Language selected:', this.language);
            this.toggleButtons(node.value);
        });
        this.toggleButtons(node.value);
    }
    // Start inactivity timer
    startInactivityTimer() {
        this.inactivityTimer = setTimeout(() => this.promptAssistance(), this.inactivityTimeout);
    }

    // Reset inactivity timer
    resetInactivityTimer() {
        clearTimeout(this.inactivityTimer);
        if (this.firstAnswerGenerated) { // Start the timer only if the first answer is generated
            this.startInactivityTimer();
        }
    }

    // Prompt user for assistance after inactivity
    promptAssistance() {
        if (this.state) {
            let assistanceMessage = { name: "KACA", message: "Is there anything else I can help you with?" };
            this.messages.push(assistanceMessage);
            this.updateChatText(this.args.chatBox);
        }
    }

    // Toggle chatbox state
    toggleState(chatbox) {
        this.state = !this.state;

        if (this.state) {
            chatbox.classList.add('chatbox--active');
            this.startTime = new Date();
            if (this.messages.length === 0) {
                let welcomeMessage = { name: "KACA", message: "Hi my name is KACA, how can I help you today?" };
                this.messages.push(welcomeMessage);
            }

            this.updateChatText(chatbox);

        } else {
            chatbox.classList.remove('chatbox--active');
        }
    }

    // Handle send button click
    onSendButton(chatbox) {
        var textField = chatbox.querySelector('input');
        let text = textField.value;

        if (text === "") {
            return;
        }

        let userMessage = { name: "User", message: text, num: this.messages.length + 1 };
        this.messages.push(userMessage);
        this.updateChatText(chatbox);
        textField.value = '';

        this.disableSendButton();
        this.showTypingIndicator(chatbox);
        clearTimeout(this.inactivityTimer);

        fetch('/predict', {
            method: 'POST',
            body: JSON.stringify({ message: text, chatId: this.currentChatId, language: this.language }),
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
        })
            .then(response => response.json())
            .then(response => {
                this.hideTypingIndicator(chatbox);
                let botMessage = { name: "KACA", message: response.answer, chatId: response.chatId };
                this.responseCount++;
                this.currentChatId = response.chatId;
                if (this.responseCount >= 3) {
                    botMessage.message += '<br>Sorry. I might not be answering your question. If you prefer a live chat session, we can switch to that.<a href="/live_session" target="_blank">Click on this link if you like to proceed</a>';
                    this.responseCount = 0;
                }
                this.messages.push(botMessage);
                this.updateChatText(chatbox);

                // Conditionally ask if the answer was helpful
                if (response.showFeedback) {
                    this.askFeedback(chatbox, this.messages.length);
                }
                this.enableSendButton();
                if (!this.firstAnswerGenerated) {
                    this.firstAnswerGenerated = true;
                }
                this.startInactivityTimer();
            })
            .catch((error) => {
                console.error('Error:', error);
                this.hideTypingIndicator(chatbox);
                this.updateChatText(chatbox);
            });
        this.toggleButtons(textField.value);
        
    }

    // Ask for feedback on the answer
    askFeedback(chatbox, messageIndex) {
        // Create the feedback message
        let feedbackMessage = {
            name: "KACA",
            message: `Was this answer helpful? <button class="thumbs_up" data-index="${messageIndex}">👍</button> <button class="thumbs_down" data-index="${messageIndex}">👎</button>`,
            feedbackIndex: this.messages.length // Store the index of this feedback message
        };

        // Add the feedback message to the chat
        this.messages.push(feedbackMessage);
        this.updateChatText(chatbox);

        // Add event listeners for the feedback buttons
        this.attachFeedbackListeners(chatbox);
    }

    // Attach event listeners for feedback buttons
    attachFeedbackListeners(chatbox) {
        const thumbsUpButtons = chatbox.querySelectorAll('.thumbs_up');
        const thumbsDownButtons = chatbox.querySelectorAll('.thumbs_down');

        thumbsUpButtons.forEach(button => {
            const index = button.getAttribute('data-index');
            button.addEventListener('click', () => this.onFeedbackButton(true, index, chatbox));
        });

        thumbsDownButtons.forEach(button => {
            const index = button.getAttribute('data-index');
            button.addEventListener('click', () => this.onFeedbackButton(false, index, chatbox));
        });
    }

    // Handle feedback button click
    onFeedbackButton(isHelpful, messageIndex, chatbox) {
        if (this.feedbackSent[messageIndex]) {
            return; // Feedback already sent for this message
        }
        this.feedbackSent[messageIndex] = true;

        console.log(`Feedback received for message index ${messageIndex}: ${isHelpful ? "helpful" : "not helpful"}`);
        if (this.currentChatId !== null) {
            fetch('/feedback', {
                method: 'POST',
                body: JSON.stringify({ chatId: this.currentChatId, isHelpful: isHelpful }),
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(response => response.json())
                .then(response => {
                    console.log('Feedback submitted:', response);
                    this.thankUserForFeedback(messageIndex, chatbox);
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        }
    }

    // Thank the user for their feedback
    thankUserForFeedback(feedbackIndex, chatbox) {
        console.log(`Replacing feedback message at index ${feedbackIndex} with thank you message`);
        // Find the feedback message and replace it with the thank you message
        const feedbackMessage = this.messages[feedbackIndex];
        feedbackMessage.message = "Thank you for your feedback";
        this.updateChatText(chatbox);
    }
     // Handle mic button click
    onMicButton(chatbox) {
        if (this.recognition && this.args.sendButton.disabled == false) {
            this.recognition.start();
        }
    }

    // Setup speech recognition
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            let errormsg = {
                name: "KACA",
                message: "Speech Recognition API not supported in this browser.",
            };
            this.messages.push(errormsg);
            this.updateChatText(chatbox);
            console.error("Speech Recognition API not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.addEventListener('result', (event) => {
            const transcript = event.results[0][0].transcript;
            const chatbox = this.args.chatBox;
            const textField = chatbox.querySelector('input');
            textField.value = transcript;
            this.onSendButton(chatbox);
        });

        this.recognition.addEventListener('end', () => {
            // Automatically restart the recognition if you want continuous listening
        });

        this.recognition.addEventListener('error', (event) => {
            let errormsg = {
                name: "KACA",
                message: 'Speech Recognition error:'+ event.error,
            };
            this.messages.push(errormsg);
            this.updateChatText(chatbox);
            console.error('Speech Recognition error:', event.error);
        });
    }

    // Show typing indicator
    showTypingIndicator(chatbox) {
        let typingIndicator = { name: "KACA", message: "typing..." };
        this.messages.push(typingIndicator);
        this.updateChatText(chatbox);
    }

    // Hide typing indicator
    hideTypingIndicator(chatbox) {
        this.messages = this.messages.filter(message => message.message !== "typing...");
        this.updateChatText(chatbox);
    }

    // Hide typing indicator
    updateChatText(chatbox) {
        var html = '';
        this.messages.slice().reverse().forEach((item, index) => {
            let message = item.message;

            // Regular expression to detect URLs
            const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

            // Replace URLs with anchor tags
            message = message.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

            if (item.name === "KACA") {
                html += '<div class="messages__item messages__item--visitor">' + message + '</div>';
            } else {
                html += '<div class="messages__item messages__item--operator">' + message + '</div>';
            }
        });

        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.innerHTML = html;
        
        // Reattach event listeners for feedback buttons
        this.attachFeedbackListeners(chatbox);
    }

    enableSendButton() {
        this.args.sendButton.disabled = false
    }

    disableSendButton() {
        this.args.sendButton.disabled = true
    }

     // Toggle between send and mic buttons based on input field text and language
    toggleButtons(text) {
        if (text.trim() === '' && this.language === 'en') {
            this.args.micButton.style.display = 'inline-block';
            this.args.sendButton.style.display = 'none';
        } else {
            this.args.micButton.style.display = 'none';
            this.args.sendButton.style.display = 'inline-block';
        }
    }
}
// Instantiate and display the chatbox
const chatbox = new Chatbox();
chatbox.display();
