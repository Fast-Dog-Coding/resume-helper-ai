// IIFE to avoid polluting the global scope
(function () {
  // DOM elements
  const chatContainer = document.getElementById('chatContainer');
  const questionInput = document.getElementById('questionInput');
  const submitBtn = document.getElementById('submitBtn');
  const resetBtn = document.getElementById('resetBtn');
  const loadingMessage = document.getElementById('loading-message');
  const infoBtn = document.getElementById('infoBtn');
  const infoPanel = document.getElementById('infoPanel');

  // Event listeners for input and buttons
  questionInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitQuestion();
    }
  });
  questionInput.addEventListener('input', (event) => {
    event.target.style.height = '1px'; // Reset to get correct scrollHeight
    const newHeight = event.target.scrollHeight;
    event.target.style.height = newHeight + 'px';
  });

  submitBtn.addEventListener('click', submitQuestion);
  resetBtn.addEventListener('click', resetThread);

  function updateInfoToggleState() {
    if (infoPanel.classList.contains('open')) {
      infoBtn.textContent = '×';
      infoBtn.style.fontSize = '1.8rem'; // make X prominent
    } else {
      infoBtn.textContent = 'ⓘ';
      infoBtn.style.fontSize = '1.5rem';
    }
  }

  infoBtn.addEventListener('click', () => {
    infoPanel.classList.toggle('open');
    updateInfoToggleState();
  });

  // Close panel when clicking outside
  document.addEventListener('click', (event) => {
    if (!infoPanel.contains(event.target) && !infoBtn.contains(event.target) && infoPanel.classList.contains('open')) {
      infoPanel.classList.remove('open');
      updateInfoToggleState();
    }
  });

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
      .then(async response => {
        if (!response.ok) {
          let errorMsg = 'Network response was not ok';
          try {
            const data = await response.json();
            errorMsg = data.error || data.message || errorMsg;
          } catch (e) {
            // keep default if not json
          }
          throw new Error(errorMsg);
        }
        return response.json();
      });
  }

  /**
   * Fetches messages for the current thread.
   */
  function getThreadMessages() {
    fetchData('/api/thread/messages')
      .then(data => {
        setMessages(data.messages);
        if (data.messages.length === 0) {
          infoPanel.classList.add('open');
        }
      })
      .catch(handleError);
  }

  /**
   * Starts showing progress messages at intervals.
   *
   * @returns {number} The interval ID.
   */
  function startProgressMessage() {
    const messages = (window.APP_CONFIG && window.APP_CONFIG.loadingMessages) || [
      'I\'m looking...',
      'Still working...',
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
      questionInput.style.height = 'auto';
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
    scrollToBottom();
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
  function resetThread() {
    if (confirm("Clear this chat? Really?")) {
      fetch('/api/thread', { method: 'DELETE' }).then(() => {
        setMessages([]);
        questionInput.value = '';
        questionInput.style.height = 'auto';
      });
    }
  }

  /**
   * Handles errors and displays a message.
   *
   * @param {Error} error - The error object.
   */
  function handleError(error) {
    console.error('Error:', error);
    let msg = 'Sorry, an error occurred. Please try again.';
    if (error.message && error.message.includes('violated moderation policies')) {
      msg = "I can't help with that.";
    }
    addMessage(msg, 'assistant');
  }

  // Observe changes in the chat container using MutationObserver
  const observer = new MutationObserver(() => scrollToBottom());
  observer.observe(chatContainer, { childList: true });

  // Initial call to fetch messages for the current thread
  getThreadMessages();

})();
