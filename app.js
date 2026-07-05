/**
 * Rubber Duck Debugger - Application Logic
 * Supports persistent state, procedural audio synthesis,
 * conversational reply engine, and a fully interactive virtual keyboard.
 */

// ==========================================================================
// Config & State Management
// ==========================================================================
const DEFAULT_CONFIG = {
    theme: 'yellow',
    personality: 'classic',
    soundEffects: true,
    kbSoundEffects: true,
    keyboardDefault: false,
    messages: []
};

// State Object
let state = { ...DEFAULT_CONFIG };

// Load State from LocalStorage
function loadState() {
    try {
        const saved = localStorage.getItem('rubber_duck_config');
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...DEFAULT_CONFIG, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load settings from LocalStorage, using defaults.", e);
    }
}

// Save State to LocalStorage
function saveState() {
    try {
        localStorage.setItem('rubber_duck_config', JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save settings to LocalStorage.", e);
    }
}

// Apply Selected Theme to Document
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    
    // If we are on settings page, update theme active buttons
    if (document.querySelector('.theme-options')) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            if (btn.dataset.theme === state.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// ==========================================================================
// Procedural Sound Synthesis (Web Audio API)
// ==========================================================================

// Play Synthesized Duck "Quack"
function playQuackSound() {
    if (!state.soundEffects) return;
    
    try {
        // Create Audio Context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        // Duck quack requires rich harmonic structure (sawtooth + triangle)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();
        
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        
        const now = audioCtx.currentTime;
        
        // Pitch swept quickly down (classic nasal quack)
        osc1.frequency.setValueAtTime(360, now);
        osc1.frequency.exponentialRampToValueAtTime(460, now + 0.04);
        osc1.frequency.exponentialRampToValueAtTime(260, now + 0.16);
        
        osc2.frequency.setValueAtTime(180, now);
        osc2.frequency.exponentialRampToValueAtTime(230, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(130, now + 0.16);
        
        // Bandpass filter centered at 950Hz with high Q gives the nasal acoustic quality
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, now);
        filter.Q.setValueAtTime(6.5, now);
        
        // Gain Envelope (fast rise, decaying quickly)
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Play
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
    } catch (err) {
        console.warn("Audio Context blocked or not supported: ", err);
    }
}

// Play Synthesized Typing Click
function playClickSound() {
    if (!state.kbSoundEffects) return;
    
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const now = audioCtx.currentTime;
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.06, now + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.03);
    } catch (e) {
        // Silent catch
    }
}

// ==========================================================================
// Duck Conversational Intelligence
// ==========================================================================

const DUCK_RESPONSES = {
    classic: {
        keywords: [
            { keys: ['loop', 'for', 'while', 'each'], replies: ["Quack! Does your loop have an explicit termination condition? What variable updates on each iteration?", "Quack quack! Have you checked if you are hitting an infinite loop or an off-by-one boundary? Let's check the size!"] },
            { keys: ['variable', 'undefined', 'null', 'let', 'const', 'var'], replies: ["Quack! Is that variable defined in the local scope? What does it log right before this line?", "Quack quack! Could it be null or undefined because of an asynchronous race condition? Is it initialized?"] },
            { keys: ['function', 'method', 'return', 'argument', 'param'], replies: ["Quack! Let's check what arguments you are actually passing. Does the receiver function handle them in order?", "Quack! Are you sure the function is returning what you think? Have you logged the output?"] },
            { keys: ['error', 'exception', 'crash', 'fail', 'stack', 'line'], replies: ["Quack! What does the exact error description say? And what line number does the stack trace point to?", "Quack quack! Let's analyze the error message word-by-word. It usually tells you exactly what is wrong!"] },
            { keys: ['css', 'style', 'color', 'layout', 'align', 'div', 'flex', 'grid'], replies: ["Quack! CSS can be sneaky. Have you opened the browser inspector to check the computed styles?", "Quack! Is there a class specificity conflict? What happens if you inspect layout borders or set border: 1px solid red?"] }
        ],
        generic: [
            "Quack! Can you explain exactly what that specific line of code is *intended* to do?",
            "Quack quack! If you had to describe the bug to a 5-year-old in one sentence, what would you say?",
            "Quack! What did you modify in the codebase right before it stopped working?",
            "Quack quack! Are you sure the server is actually running your latest saved changes?",
            "Quack! Let's pause and trace the path of the data. Where does the data enter, and where does it break?"
        ]
    },
    senior: {
        keywords: [
            { keys: ['loop', 'for', 'while', 'each'], replies: ["Quack. Nested loops are highly suboptimal. Have you computed the algorithmic complexity? Is an O(n) hash map lookup better?", "Quack. Ensure your loop bounds are mathematically sound. Loops without precise boundaries are major memory leaks."] },
            { keys: ['variable', 'undefined', 'null', 'let', 'const', 'var'], replies: ["Quack. Scope pollution and global mutation are anti-patterns. Are you properly isolating state through immutability?", "Quack. If a variable is undefined, you likely have a race condition or a broken dependency injection stream."] },
            { keys: ['function', 'method', 'return', 'argument', 'param'], replies: ["Quack. This method appears to violate the Single Responsibility Principle. Is it doing too much side-effect computation?", "Quack. Check your argument types. Are we utilizing strict static typing here, or are you hoping for JavaScript miracle conversions?"] },
            { keys: ['error', 'exception', 'crash', 'fail', 'stack', 'line'], replies: ["Quack. Exceptions are structured signals. Read the stack trace rigorously. What exactly failed in the call hierarchy?", "Quack. Let's not guess. What does your error logging framework report in the diagnostic levels?"] },
            { keys: ['css', 'style', 'color', 'layout', 'align', 'div', 'flex', 'grid'], replies: ["Quack. Relying on custom CSS overrides is an anti-pattern. Have you established a consistent layout grid system?", "Quack. Specify your layout properties cleanly. Is it a flex-shrink conflict, or did you mess up box-sizing?"] }
        ],
        generic: [
            "Quack. Sketch out the data-flow diagram for me. Let's trace it logically.",
            "Quack. Do your automated unit tests cover this branch, or are we manually debugging in production again?",
            "Quack. What is the actual runtime state of the program compared to your mental compiler?",
            "Quack. Are we trying to fix a architectural design flaw by pasting dirty syntax patches?",
            "Quack. Let's review your core requirements. Does this feature even need to exist in this complex manner?"
        ]
    },
    cheerleader: {
        keywords: [
            { keys: ['loop', 'for', 'while', 'each'], replies: ["Quack! You've got this loop! Just print the values at the start of each cycle and you'll find it!", "Quack quack! You are so close! Let's check the loop limits together, you're doing amazing!"] },
            { keys: ['variable', 'undefined', 'null', 'let', 'const', 'var'], replies: ["Quack! Variables can be tricky, but you are smarter than any compiler! Let's inspect its value, we'll fix it!", "Quack quack! Underfined is just a temporary state! We'll track it down and assign it a beautiful value! ✨"] },
            { keys: ['function', 'method', 'return', 'argument', 'param'], replies: ["Quack! That function is written beautifully! Let's check the parameters, you've almost got it functioning perfectly!", "Quack! High five! Let's follow the return value, you're a super coding rockstar! ⭐"] },
            { keys: ['error', 'exception', 'crash', 'fail', 'stack', 'line'], replies: ["Quack! Errors are just stepping stones to greatness! Let's look at the line number, you'll solve this in a jiffy!", "Quack quack! Cheer up, every coder breaks things! You've solved way tougher bugs than this before! Let's go! 🎉"] },
            { keys: ['css', 'style', 'color', 'layout', 'align', 'div', 'flex', 'grid'], replies: ["Quack! Your styling tastes are spectacular! We will align that div and make it look absolutely stunning! 💖", "Quack! Flexbox is super fun once it clicks! You're doing great, let's fix that layout right now!"] }
        ],
        generic: [
            "Quack! Take a deep breath! You are a brilliant programmer, and we will crush this bug together!",
            "Quack quack! Tell me more about the logic! I love listening to you explain code, you're so smart!",
            "Quack! Don't worry, even the best coders get stuck. Let's walk through it together and solve it! 🚀",
            "Quack quack! You are doing absolutely incredible! What's the next line we should look at?",
            "Quack! Believe in yourself! You're making awesome progress. Let's check what the console is saying!"
        ]
    },
    sarcastic: {
        keywords: [
            { keys: ['loop', 'for', 'while', 'each'], replies: ["Quack. Oh, an infinite loop! How vintage. Trying to stress-test your CPU or was that intentional?", "Quack quack! That loop runs exactly... zero times. Outstanding optimization strategy!"] },
            { keys: ['variable', 'undefined', 'null', 'let', 'const', 'var'], replies: ["Quack. Ah, undefined! My absolute favorite coding mystery. Have you tried actually declaring it first?", "Quack. Maybe if you stare at that null variable for another twenty minutes, it will magically populate itself."] },
            { keys: ['function', 'method', 'return', 'argument', 'param'], replies: ["Quack. That function is so large, it has its own zip code. Ever heard of refactoring?", "Quack! Let's pass random arguments and see what happens. That's usually how this codebase works, right?"] },
            { keys: ['error', 'exception', 'crash', 'fail', 'stack', 'line'], replies: ["Quack. Congratulations! You successfully broke the code. What does the red screaming error text say?", "Quack quack! I've seen plastic ducks compile better logic than this crash, but go on, read the stack trace."] },
            { keys: ['css', 'style', 'color', 'layout', 'align', 'div', 'flex', 'grid'], replies: ["Quack. Centering a div again? Don't worry, maybe in 2030 they'll make an automated button for that.", "Quack. Wow, beautiful layout. If you were aiming for a post-apocalyptic, distorted retro 90s aesthetic."] }
        ],
        generic: [
            "Quack. Have you tried turning it off and on again? That's about as technical as my advice gets.",
            "Quack quack! I'm just a hollow yellow rubber duck, and even I know that line of code is questionable.",
            "Quack. Did we actually write this ourselves, or was this a late-night copy-paste from a sketchy forum?",
            "Quack. Fascinating logic. Truly. Tell me more, I need a good laugh today.",
            "Quack quack! Let's take a wild guess. That's worked out great so far, hasn't it?"
        ]
    }
};

// Analyze message and return customized response
function getDuckResponse(userMessage) {
    const text = userMessage.toLowerCase();
    const config = DUCK_RESPONSES[state.personality] || DUCK_RESPONSES.classic;
    
    // Check keyword groups
    for (const group of config.keywords) {
        for (const key of group.keys) {
            if (text.includes(key)) {
                const index = Math.floor(Math.random() * group.replies.length);
                return group.replies[index];
            }
        }
    }
    
    // Fallback to generic responses
    const index = Math.floor(Math.random() * config.generic.length);
    return config.generic[index];
}

// ==========================================================================
// Main Chat Interface Logic (index.html)
// ==========================================================================
let isKeyboardVisible = false;
let isShiftActive = false;

// Initialize index.html elements
function initChatPage() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    const toggleKbBtn = document.getElementById('toggle-keyboard-btn');
    const keyboardPanel = document.getElementById('virtual-keyboard');

    if (!chatMessages) return; // Exit if not on chat page

    // Load saved keyboard state or use defaults
    isKeyboardVisible = state.keyboardDefault;
    if (isKeyboardVisible) {
        keyboardPanel.classList.remove('hidden');
        toggleKbBtn.classList.add('active');
    }

    // Set Status Sub-text
    const statusText = document.getElementById('duck-status-text');
    if (statusText) {
        const personalities = {
            classic: "Classic Debugger 🦆",
            senior: "Senior Architect 👓",
            cheerleader: "Cheerleader Duck ✨",
            sarcastic: "Sarcastic Buddy 😏"
        };
        statusText.textContent = personalities[state.personality] || "Ready to listen...";
    }

    // Render Initial Messages
    if (state.messages && state.messages.length > 0) {
        state.messages.forEach(msg => appendMessageElement(msg.sender, msg.text, msg.timestamp));
    } else {
        // First introduction message
        const welcomeMessage = "Quack! Hello there! I am your personal Rubber Duck Debugging assistant. 🦆\n\nExplain your programming problem, explain your algorithms, or paste your error message. I'm here to listen and help you figure it out!";
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appendMessageElement('duck', welcomeMessage, nowStr);
        state.messages = [{ sender: 'duck', text: welcomeMessage, timestamp: nowStr }];
        saveState();
    }

    // Event Listeners
    sendBtn.addEventListener('click', handleUserSend);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserSend();
        }
    });

    toggleKbBtn.addEventListener('click', () => {
        isKeyboardVisible = !isKeyboardVisible;
        if (isKeyboardVisible) {
            keyboardPanel.classList.remove('hidden');
            toggleKbBtn.classList.add('active');
        } else {
            keyboardPanel.classList.add('hidden');
            toggleKbBtn.classList.remove('active');
        }
        playClickSound();
        scrollToBottom();
    });

    // Render Virtual Keyboard keys
    renderVirtualKeyboard();

    // Physical Keyboard Visual Feedback
    window.addEventListener('keydown', (e) => {
        let keyChar = e.key;
        if (keyChar === ' ') keyChar = 'space';
        else if (keyChar === 'Backspace') keyChar = 'backspace';
        else if (keyChar === 'Enter') keyChar = 'enter';
        else if (keyChar === 'Shift') keyChar = 'shift';
        
        const kbdKey = document.querySelector(`.kbd-key[data-key="${keyChar.toLowerCase()}"]`);
        if (kbdKey) {
            kbdKey.classList.add('key-pressed');
            if (state.kbSoundEffects) playClickSound();
        }
    });

    window.addEventListener('keyup', (e) => {
        let keyChar = e.key;
        if (keyChar === ' ') keyChar = 'space';
        else if (keyChar === 'Backspace') keyChar = 'backspace';
        else if (keyChar === 'Enter') keyChar = 'enter';
        else if (keyChar === 'Shift') keyChar = 'shift';

        const kbdKey = document.querySelector(`.kbd-key[data-key="${keyChar.toLowerCase()}"]`);
        if (kbdKey) {
            kbdKey.classList.remove('key-pressed');
        }
    });
}

// Append a Message bubble element to the chat history UI
function appendMessageElement(sender, text, timestamp) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messageBubble = document.createElement('div');
    messageBubble.className = `message-bubble ${sender}-msg`;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'duck' ? '🦆' : '👤';

    // Content Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-text-wrapper';

    // Text Bubble
    const body = document.createElement('div');
    body.className = 'msg-body';
    
    // Check for code segments and format them
    if (text.includes('```')) {
        const parts = text.split('```');
        parts.forEach((part, index) => {
            if (index % 2 === 1) {
                const codePre = document.createElement('pre');
                codePre.textContent = part.trim();
                body.appendChild(codePre);
            } else {
                if (part.trim()) {
                    const textNode = document.createTextNode(part);
                    body.appendChild(textNode);
                }
            }
        });
    } else {
        // Support newlines with breaks
        body.innerHTML = text.replace(/\n/g, '<br>');
    }

    // Timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = timestamp;

    wrapper.appendChild(body);
    wrapper.appendChild(timeSpan);
    messageBubble.appendChild(avatar);
    messageBubble.appendChild(wrapper);
    container.appendChild(messageBubble);

    scrollToBottom();
}

// Scroll chat area to the absolute bottom
function scrollToBottom() {
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) {
        setTimeout(() => {
            chatArea.scrollTop = chatArea.scrollHeight;
        }, 30);
    }
}

// Handle sending a user message
function handleUserSend() {
    const input = document.getElementById('message-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    // Clear input
    input.value = '';
    input.focus();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Append user message
    appendMessageElement('user', text, timestamp);
    
    // Save to state
    state.messages.push({ sender: 'user', text, timestamp });
    saveState();

    // Trigger typing indicator & status change
    const typingIndicator = document.getElementById('typing-indicator');
    const headerStatus = document.querySelector('.status-indicator');
    
    if (typingIndicator) typingIndicator.classList.remove('hidden');
    if (headerStatus) {
        headerStatus.className = 'status-indicator typing';
    }
    
    scrollToBottom();

    // Simulate realistic duck typing delay (1.2 to 2 seconds)
    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
        // Get custom reply
        const duckText = getDuckResponse(text);
        const replyTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Hide typing indicator
        if (typingIndicator) typingIndicator.classList.add('hidden');
        if (headerStatus) {
            headerStatus.className = 'status-indicator online';
        }

        // Append duck response
        appendMessageElement('duck', duckText, replyTimestamp);
        playQuackSound();

        // Save to state
        state.messages.push({ sender: 'duck', text: duckText, timestamp: replyTimestamp });
        saveState();
    }, delay);
}

// ==========================================================================
// Virtual Keyboard Dynamic Rendering
// ==========================================================================
const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', 'backspace'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    ['space']
];

function renderVirtualKeyboard() {
    const container = document.querySelector('.keyboard-keys-container');
    if (!container) return;

    container.innerHTML = ''; // Clear container

    KEYBOARD_ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';

        row.forEach(key => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'kbd-key';
            button.dataset.key = key;

            // Specialized styling & labels
            if (key === 'backspace') {
                button.className += ' key-wide';
                button.innerHTML = '⌫';
            } else if (key === 'enter') {
                button.className += ' key-wide';
                button.innerHTML = 'Enter';
            } else if (key === 'shift') {
                button.className += ' key-wide';
                button.innerHTML = '⇧ Shift';
                if (isShiftActive) button.className += ' active-toggle';
            } else if (key === 'space') {
                button.className += ' key-space';
                button.innerHTML = 'Space';
            } else {
                // Character keys
                button.innerHTML = isShiftActive ? key.toUpperCase() : key.toLowerCase();
            }

            // Click Handler
            button.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent loss of focus on the text input
                handleVirtualKeypress(key);
            });

            rowDiv.appendChild(button);
        });

        container.appendChild(rowDiv);
    });
}

function handleVirtualKeypress(key) {
    const input = document.getElementById('message-input');
    if (!input) return;

    playClickSound();

    if (key === 'backspace') {
        const val = input.value;
        input.value = val.substring(0, val.length - 1);
    } else if (key === 'enter') {
        handleUserSend();
    } else if (key === 'shift') {
        isShiftActive = !isShiftActive;
        renderVirtualKeyboard();
    } else if (key === 'space') {
        input.value += ' ';
    } else {
        // Insert character
        const char = isShiftActive ? key.toUpperCase() : key.toLowerCase();
        input.value += char;
        
        // Reset shift after typing a capital character (simulating mobile behavior)
        if (isShiftActive) {
            isShiftActive = false;
            renderVirtualKeyboard();
        }
    }
    
    // Trigger input event to update visual listeners
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
}

// ==========================================================================
// Settings Page Logic (settings.html)
// ==========================================================================
function initSettingsPage() {
    const settingsArea = document.querySelector('.settings-area');
    if (!settingsArea) return; // Exit if not on settings page

    // 1. Set Visual Active States on Load
    applyTheme();

    // Set personality radio active selection
    const radioBtn = document.querySelector(`input[name="personality"][value="${state.personality}"]`);
    if (radioBtn) radioBtn.checked = true;

    // Set toggle switch active states
    const soundSwitch = document.getElementById('sound-switch');
    if (soundSwitch) soundSwitch.checked = state.soundEffects;

    const kbSoundSwitch = document.getElementById('kb-sound-switch');
    if (kbSoundSwitch) kbSoundSwitch.checked = state.kbSoundEffects;

    const keyboardSwitch = document.getElementById('keyboard-switch');
    if (keyboardSwitch) keyboardSwitch.checked = state.keyboardDefault;

    // 2. Bind Change / Click Observers
    
    // Theme Click Selection
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.theme = btn.dataset.theme;
            saveState();
            applyTheme();
            playClickSound();
        });
    });

    // Personality Radio Change Selection
    document.querySelectorAll('input[name="personality"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.personality = e.target.value;
            saveState();
            
            // Clear current chat history when personality changes to make the transition natural
            state.messages = [];
            saveState();
            
            playQuackSound();
        });
    });

    // Switches Observers
    if (soundSwitch) {
        soundSwitch.addEventListener('change', (e) => {
            state.soundEffects = e.target.checked;
            saveState();
            if (state.soundEffects) playQuackSound();
        });
    }

    if (kbSoundSwitch) {
        kbSoundSwitch.addEventListener('change', (e) => {
            state.kbSoundEffects = e.target.checked;
            saveState();
            playClickSound();
        });
    }

    if (keyboardSwitch) {
        keyboardSwitch.addEventListener('change', (e) => {
            state.keyboardDefault = e.target.checked;
            saveState();
            playClickSound();
        });
    }
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    applyTheme();
    initChatPage();
    initSettingsPage();
});
