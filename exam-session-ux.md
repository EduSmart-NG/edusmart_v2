Exam Interface UX Flow
Pre-Exam Access Paths
Direct Link (Recruitment / Competition)
• User Flow:
◦ User receives a link from the exam creator → lands directly on the Instructions Page (skips Pre-Exam step 1).
◦ Instructions Page displays:
▪ Exam type
▪ Time limit (if any)
▪ Anti-cheat rules
▪ Shuffled status (questions/options)
◦ Action: "Start Exam" button → exam begins immediately.

Self-Selection (Test / Practice)
• User Flow:
◦ User navigates to the Exam Dashboard → lands on the Exam Selection Page.
◦ Filters/Options:
▪ Exam Type (e.g., JAMB, WAEC, etc.)
▪ Subject
▪ Year
◦ Results: Display available exams matching filters.

Pre-Exam Configuration (Test / Practice Only)
Configuration Screen
After the user selects an exam, display a configuration panel:
Setting
Practice
Test

# of Questions

Slider: 1–80
Slider: 1–80
Shuffle Questions
Toggle
Toggle
Shuffle Options
Toggle
Toggle
Time Limit
❌ Not available
Input field (minutes)
Timer Type
Advisory (informational)
Enforced countdown
• Validation: Users cannot start the exam without setting a time limit for Test Mode.
• Action: "Start Exam" button (enabled only when valid configuration is set).

During Exam - By Category
Practice Mode
• Question Layout:
◦ Question + 4 shuffled options (if enabled) + advisory timer (optional).
• Answer Submission:
◦ Click option → immediate reveal (✓/✗ badge).
• Inline Feedback:
◦ Show correct answer + brief explanation.
• Navigation:
◦ "Next" / "Previous" buttons enabled; full review access available.
• Fullscreen: Optional toggle button.

Test Mode
• Question Layout:
◦ Same as Practice Mode, but no immediate answer reveal.
• Answer Submission:
◦ Click option → moves to the next question (no feedback).
• Timer:
◦ Countdown enforced, with warnings at 5 minutes and 1 minute remaining.
• Navigation:
◦ "Next" / "Previous" buttons enabled; users can flag questions for review.
• Fullscreen:
◦ Auto-enabled; exiting triggers a warning modal.
• Anti-Cheat Features:
◦ Tab-switch detection, window blur, and copy-paste actions disabled.
• Timeout Behavior:
◦ Auto-submit any remaining questions if time expires.

Recruitment / Competition (Direct Link)
• Shuffled Status:
◦ Displayed on the Instructions Page (configured by the exam creator).
• Question Layout:
◦ Same as Test Mode, with no immediate feedback.
• Answer Submission:
◦ Submit answer → moves to the next question (no feedback).
• Navigation:
◦ Linear navigation only; no review access.
• Fullscreen:
◦ Auto-enabled with strict enforcement.
• Anti-Cheat Features:
◦ Full monitoring during the exam.

Challenge (Direct Link)
• Same as Recruitment/Competition Mode, with the addition of:
◦ Live Status Bar: Displays participant progress in real time.

Post-Exam
Practice Mode
• Summary:
◦ Total questions answered.
◦ Correct answers and explanations.
• Leaderboard: None.
• Action:
◦ Retake the exam with the same/different settings.

Test Mode
• Summary:
◦ Score and performance breakdown.
• Certificate:
◦ If passing score is achieved.
• Action:
◦ Retake the exam or explore other available exams.

Recruitment / Competition / Challenge
• Summary:
◦ Recruitment/Competition: Score only.
◦ Challenge: Score + Leaderboard.
• Results:
◦ Released per the exam creator's schedule.

Exam timing must be on the server to avoid manipulation on the browser.
