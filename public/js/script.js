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

  /**
   * Toggles the input fields and buttons to be enabled or disabled.
   *
   * @param {boolean} [disable=true] - Whether to disable the inputs.
   */
  function toggleInput(disable = true) {
    questionInput.disabled = disable;
    submitBtn.disabled = disable;
    resetBtn.disabled = disable;
  }

  /**
   * Utility function to handle API requests.
   *
   * @param {string} url - The URL to fetch.
   * @param {Object} [options={}] - The fetch options.
   * @returns {Promise<Object>} The fetch promise.
   */
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

  /**
   * Fetches messages for the current thread.
   */
  function getThreadMessages() {
    fetchData('/api/thread/messages')
      .then(data => setMessages(data.messages))
      .catch(handleError);
  }

  /**
   * Starts showing progress messages at intervals.
   *
   * @returns {number} The interval ID.
   */
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

  /**
   * Stops showing progress messages.
   *
   * @param {number} intervalId - The interval ID to clear.
   */
  function stopProgressMessage(intervalId) {
    clearInterval(intervalId);
    loadingMessage.hidden = true;
  }

  /**
   * Handles question submission.
   */
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

  /**
   * Sets messages in the chat container.
   *
   * @param {Array<{ content: string, role: string }>} messages - The messages to set.
   */
  function setMessages(messages) {
    chatContainer.innerHTML = '';
    messages.forEach(message => addMessage(message.content, message.role));
  }

  /**
   * Adds a single message to the chat container.
   *
   * @param {string} message - The message content.
   * @param {string} sender - The message sender (e.g., 'user', 'assistant').
   */
  function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = marked.parse(message); // Convert Markdown to HTML

    chatContainer.appendChild(messageElement);
  }

  /**
   * Scrolls the chat container to the bottom.
   */
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  /**
   * Sets the height of the chat container dynamically based on available space.
   */
  function setChatContainerHeight() {
    const inputContainerHeight = document.querySelector('.input-container').offsetHeight;
    const availableHeight = window.innerHeight - inputContainerHeight;
    chatContainer.style.height = `${availableHeight}px`;
  }

  /**
   * Resets the current thread by expiring the threadId cookie.
   */
  function resetThread() {
    document.cookie = 'threadId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    getThreadMessages();
  }

  /**
   * Handles errors and displays a message.
   *
   * @param {Error} error - The error object.
   */
  function handleError(error) {
    console.error('Error:', error);
    addMessage('Sorry, an error occurred. Please try again.', 'assistant');
  }

  // Observe changes in the chat container using MutationObserver
  const observer = new MutationObserver(() => scrollToBottom());
  observer.observe(chatContainer, { childList: true });

  // Adjust the height of the chat container on window load and resize
  window.addEventListener('load', setChatContainerHeight);
  window.addEventListener('resize', setChatContainerHeight);

  // Initial call to fetch messages for the current thread
  getThreadMessages();

})();
