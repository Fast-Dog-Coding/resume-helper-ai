const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingMessage = document.getElementById('loading-message');

questionInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    submitQuestion();
  }
});
submitBtn.addEventListener('click', submitQuestion);
resetBtn.addEventListener('click', () => {
  // expire the threadId cookie to start a new thread.
  document.cookie = `threadId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  getThreadMessages();
});

function disableInput(toggleOn = true) {
  questionInput.disabled = toggleOn;
  submitBtn.disabled = toggleOn;
  resetBtn.disabled = toggleOn;
}

function getThreadMessages() {
  fetch('/api/thread/messages', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      setMessages(data.messages);

    })
    .catch(error => {
      console.error('Error:', error);
      addMessage('Sorry, an error occurred. Please try again.', 'assistant');
    });
}

function startProgressMessage() {
  const messages = [
    'I\'m looking...',
    'Still working...',
    'Hmmm...',
    'Thanks for being patient...',
    'Almost there...'
  ];
  let index = 0;
  loadingMessage.textContent = messages[index];
  loadingMessage.hidden = false;

  return setInterval(() => {
    loadingMessage.textContent = messages[index];
    index = (index + 1) % messages.length;
  }, 5000);
}

function stopProgressMessage(intervalId) {
  clearInterval(intervalId);
  loadingMessage.hidden = true;
}

function submitQuestion() {
  const question = questionInput.value.trim();
  if (question !== '') {
    disableInput();
    const progressId = startProgressMessage();
    addMessage(question, 'user');

    fetch('/api/ask-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: question })

    })
      .then(response => response.json())
      .then(data => {
        setMessages(data.messages);

      })
      .catch(error => {
        console.error('Error:', error);
        addMessage('Sorry, an error occurred. Please try again.', 'assistant');
      })
      .finally(() => {
        disableInput(false); // enable inputs again
        stopProgressMessage(progressId);
      });

    questionInput.value = '';
  }
}

function setMessages(messages) {
  chatContainer.innerHTML = '';
  messages.forEach(
    message => addMessage(message.content, message.role)
  );
}

function addMessage(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', sender);
  messageElement.innerHTML = marked.parse(message); // convert MD to HTML

  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

getThreadMessages();
