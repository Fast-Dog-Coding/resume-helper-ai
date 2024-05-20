// IIFE to avoid polluting the global scope
(function() {
  // DOM elements
  const chatContainer = document.getElementById('chatContainer');
  const questionInput = document.getElementById('questionInput');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');
  const loadingMessage = document.getElementById('loading-message');

  // Event listeners for input and buttons
  questionInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      submitQuestion();
    }
  });
  submitBtn.addEventListener('click', submitQuestion);
  resetBtn.addEventListener('click', resetThread);

  // Utility function to disable or enable input fields and buttons
  function toggleInput(disable = true) {
    questionInput.disabled = disable;
    submitBtn.disabled = disable;
    resetBtn.disabled = disable;
  }

  // Utility function to handle API requests
  function fetchData(url, options = {}) {
    return fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      });
  }

  // Fetch messages for the current thread
  function getThreadMessages() {
    fetchData('/api/thread/messages')
      .then(data => setMessages(data.messages))
      .catch(handleError);
  }

  // Start showing progress messages
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
      index = (index + 1) % messages.length;
      loadingMessage.textContent = messages[index];
    }, 5000);
  }

  // Stop showing progress messages
  function stopProgressMessage(intervalId) {
    clearInterval(intervalId);
    loadingMessage.hidden = true;
  }

  // Handle question submission
  function submitQuestion() {
    const question = questionInput.value.trim();
    if (question) {
      toggleInput();
      const progressId = startProgressMessage();
      addMessage(question, 'user');

      fetchData('/api/ask-assistant', {
        method: 'POST',
        body: JSON.stringify({ content: question })
      })
        .then(data => setMessages(data.messages))
        .catch(handleError)
        .finally(() => {
          toggleInput(false);
          stopProgressMessage(progressId);
        });

      questionInput.value = '';
    }
  }

  // Set messages in the chat container
  function setMessages(messages) {
    chatContainer.innerHTML = '';
    messages.forEach(message => addMessage(message.content, message.role));
  }

  // Add a single message to the chat container
  function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = marked.parse(message); // Convert Markdown to HTML

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
  }

  // Reset the current thread by expiring the threadId cookie
  function resetThread() {
    document.cookie = 'threadId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    getThreadMessages();
  }

  // Handle errors and display a message
  function handleError(error) {
    console.error('Error:', error);
    addMessage('Sorry, an error occurred. Please try again.', 'assistant');
  }

  // Initial call to fetch messages for the current thread
  getThreadMessages();

})();
