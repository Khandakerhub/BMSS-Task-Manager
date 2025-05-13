// DOM Elements
		const newTaskInput = document.getElementById('newTaskInput');
		const deadlineInput = document.getElementById('deadlineInput');
		const addTaskBtn = document.getElementById('addTaskBtn');
		const columns = document.querySelectorAll('.drop-zone');
		const todoColumn = document.getElementById('todo');
		const confirmationModal = document.getElementById('confirmationModal');
		const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
		const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
		const validationModal = document.getElementById('validationModal'); // Get validation modal
		const validationOkBtn = document.getElementById('validationOkBtn'); // Get validation OK button
		const validationMessageEl = document.getElementById('validationMessage'); // Get validation message element
		const currentDateEl = document.querySelector('.currentDate');
		const currentTimeEl = document.querySelector('.currentTime');
		const confettiCanvas = document.getElementById('confetti-canvas');

		// State Variables
		let taskIdCounter = 0;
		let draggedItem = null;
		let taskToDelete = null;
		let dateTimeInterval = null;
		let deadlineCheckInterval = null;

		// Confetti Instance
		const myConfetti = window.confetti ? confetti.create(confettiCanvas, { resize: true, useWorker: true }) : null;

		// --- Date & Time Update ---
		function updateDateTime() {
			const now = new Date();
			const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
			currentDateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
			const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
			currentTimeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);
		}

		// --- Formatting Functions ---
		function formatTimestamp(date) {
			return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
		}
		function formatDeadlineForDisplay(dateString) {
			if (!dateString) return '';
			const date = new Date(dateString + 'T00:00:00');
			const options = { month: 'short', day: 'numeric', year: 'numeric' };
			return date.toLocaleDateString('en-US', options);
		}

		// --- Task Creation ---
		function createTaskElement(taskData) {
			const taskDiv = document.createElement('div');
			taskDiv.classList.add('task-card', 'draggable');
			taskDiv.setAttribute('draggable', 'true');
			taskDiv.id = `task-${taskIdCounter++}`;

			taskDiv.dataset.creationTimestamp = taskData.creationTimestamp || formatTimestamp(new Date());
			taskDiv.dataset.baseText = taskData.text;
			if (taskData.deadline) {
				taskDiv.dataset.deadlineDate = taskData.deadline;
			}

			const detailsDiv = document.createElement('div');
			detailsDiv.classList.add('task-details');

			const taskContent = document.createElement('span');
			taskContent.classList.add('task-content');
			taskContent.textContent = taskData.text;
			detailsDiv.appendChild(taskContent);

			if (taskData.deadline) {
				const formattedDeadline = formatDeadlineForDisplay(taskData.deadline);
				if (formattedDeadline) {
					const deadlineEl = document.createElement('small');
					deadlineEl.classList.add('task-deadline');
					deadlineEl.textContent = `Deadline: ${formattedDeadline}`;
					detailsDiv.appendChild(deadlineEl);
				}
			}

			const timestamp = document.createElement('small');
			timestamp.classList.add('task-timestamp');
			timestamp.textContent = taskDiv.dataset.creationTimestamp;
			taskDiv.appendChild(timestamp);

			const deleteBtn = document.createElement('button');
			deleteBtn.textContent = '✕';
			deleteBtn.classList.add('delete-btn');
			deleteBtn.onclick = (e) => { e.stopPropagation(); showConfirmationModal(taskDiv); };
			taskDiv.appendChild(deleteBtn);

			taskDiv.appendChild(detailsDiv);

			taskDiv.addEventListener('dragstart', handleDragStart);
			taskDiv.addEventListener('dragend', handleDragEnd);

			checkSingleTaskDeadline(taskDiv);

			return taskDiv;
		}

		// --- Add Task (with Validation) ---
		function addTask() {
			const taskText = newTaskInput.value.trim();
			const deadlineValue = deadlineInput.value; // Get value directly

			// Validation Check
			if (!taskText || !deadlineValue) {
				let message = "Please provide both a task description and a due date.";
				if (!taskText && deadlineValue) {
					message = "Please provide a task description.";
				} else if (taskText && !deadlineValue) {
					message = "Please select a due date.";
				}
				showValidationModal(message); // Show validation pop-up
				return; // Stop the function here
			}

			// Proceed if validation passes
			const taskData = {
				text: taskText,
				creationTimestamp: formatTimestamp(new Date()),
				deadline: deadlineValue // Store YYYY-MM-DD
			};

			const taskElement = createTaskElement(taskData);
			todoColumn.appendChild(taskElement);

			newTaskInput.value = '';
			deadlineInput.value = ''; // Clear date input
			saveTasks();
		}


		addTaskBtn.addEventListener('click', addTask);
		newTaskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

		// --- Deadline Checking ---
		function checkSingleTaskDeadline(taskCard) {
			const deadlineStr = taskCard.dataset.deadlineDate;
			taskCard.classList.remove('deadline-soon', 'deadline-overdue');

			if (deadlineStr) {
				try {
					const deadlineDate = new Date(deadlineStr + 'T00:00:00');
					const today = new Date();
					today.setHours(0, 0, 0, 0);

					const diffTime = deadlineDate.getTime() - today.getTime();
					const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

					if (diffDays < 0) {
						taskCard.classList.add('deadline-overdue');
					} else if (diffDays <= 1) {
						taskCard.classList.add('deadline-soon');
					}

				} catch (e) {
					console.error("Error parsing deadline date:", deadlineStr, e);
				}
			}
		}

		function checkAllDeadlines() {
			document.querySelectorAll('.task-card').forEach(checkSingleTaskDeadline);
		}


		// --- Drag and Drop ---
		function handleDragStart(event) {
			if (event.target.classList.contains('draggable')) {
				draggedItem = event.target;
				setTimeout(() => { if (draggedItem) draggedItem.style.opacity = '0.5'; }, 0);
			} else { event.preventDefault(); }
		}
		function handleDragEnd(event) {
			if (event.target.classList.contains('draggable')) { event.target.style.opacity = '1'; }
			draggedItem = null;
		}
		columns.forEach(column => {
			column.addEventListener('dragover', (event) => {
				event.preventDefault();
				const dropZone = event.target.closest('.drop-zone');
				if (dropZone && draggedItem) dropZone.classList.add('drag-over');
			});
			column.addEventListener('dragleave', (event) => {
				const dropZone = event.target.closest('.drop-zone');
				if (dropZone) dropZone.classList.remove('drag-over');
			});
			column.addEventListener('drop', (event) => {
				event.preventDefault();
				const dropZone = event.target.closest('.drop-zone');
				if (dropZone) {
					dropZone.classList.remove('drag-over');
					if (draggedItem && draggedItem.parentElement !== dropZone) {
						const previousColumnId = draggedItem.parentElement.id;
						dropZone.appendChild(draggedItem);
						if (dropZone.id === 'done' && previousColumnId !== 'done') triggerConfetti();
						saveTasks();
					}
				}
				if (draggedItem) draggedItem.style.opacity = '1';
				draggedItem = null;
			});
		});

		// --- Confetti ---
		function triggerConfetti() {
			if (myConfetti) { myConfetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } }); }
			else { console.warn("Confetti library not loaded."); }
		}

		// --- Modal Handling ---
		// Delete Confirmation Modal
		function showConfirmationModal(taskElement) { taskToDelete = taskElement; confirmationModal.classList.add('visible'); }
		function hideConfirmationModal() { taskToDelete = null; confirmationModal.classList.remove('visible'); }
		confirmDeleteBtn.addEventListener('click', () => { if (taskToDelete) { taskToDelete.remove(); saveTasks(); } hideConfirmationModal(); });
		cancelDeleteBtn.addEventListener('click', hideConfirmationModal);
		confirmationModal.addEventListener('click', (event) => { if (event.target === confirmationModal) hideConfirmationModal(); });

		// Validation Error Modal
		function showValidationModal(message) {
			validationMessageEl.textContent = message; // Set the specific error message
			validationModal.classList.add('visible');
		}
		function hideValidationModal() {
			validationModal.classList.remove('visible');
		}
		validationOkBtn.addEventListener('click', hideValidationModal); // OK button hides the modal
		validationModal.addEventListener('click', (event) => { if (event.target === validationModal) hideValidationModal(); }); // Click outside hides modal


		// --- Local Storage ---
		function saveTasks() {
			const tasks = {};
			columns.forEach(column => {
				tasks[column.id] = [];
				column.querySelectorAll('.task-card').forEach(task => {
					const originalText = task.dataset.baseText;
					const creationTimestamp = task.dataset.creationTimestamp;
					const deadlineDate = task.dataset.deadlineDate || null;

					if (originalText && creationTimestamp) {
						tasks[column.id].push({
							text: originalText,
							creationTimestamp: creationTimestamp,
							deadline: deadlineDate
						});
					} else {
						console.warn("Could not save task, missing baseText or creationTimestamp in dataset:", task);
					}
				});
			});
			localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
		}

		function loadTasks() {
			const savedTasks = localStorage.getItem('kanbanTasks');
			if (savedTasks) {
				try {
					const tasks = JSON.parse(savedTasks);
					taskIdCounter = 0;
					columns.forEach(column => column.innerHTML = '');
					Object.keys(tasks).forEach(columnId => {
						const column = document.getElementById(columnId);
						if (column && Array.isArray(tasks[columnId])) {
							tasks[columnId].forEach(taskData => {
								if (typeof taskData === 'object' && taskData !== null &&
									typeof taskData.text === 'string' && typeof taskData.creationTimestamp === 'string') {
									const taskElement = createTaskElement(taskData);
									column.appendChild(taskElement);
								} else {
									console.warn("Skipping invalid task data during load:", taskData);
								}
							});
						} else {
							console.warn(`Error loading column ${columnId} data.`);
						}
					});
					taskIdCounter = document.querySelectorAll('.task-card').length;
					checkAllDeadlines();
				} catch (e) {
					console.error("Error parsing tasks from local storage:", e);
				}
			}
		}

		// --- Initial Setup ---
		document.addEventListener('DOMContentLoaded', () => {
			loadTasks();
			updateDateTime();

			if (dateTimeInterval) clearInterval(dateTimeInterval);
			if (deadlineCheckInterval) clearInterval(deadlineCheckInterval);

			dateTimeInterval = setInterval(updateDateTime, 1000);
			deadlineCheckInterval = setInterval(checkAllDeadlines, 60000); // Check every minute
		});