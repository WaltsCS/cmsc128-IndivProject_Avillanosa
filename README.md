The backend I chose is: Flask + SQLite.
I chose this as my backend because it's lightweight, powerful enough for APIs, I was familiar with SQL,
both are easy to use as backend, and there was no server setup needed.

How to run the webapp:
1. Go to the project folder, and open command prompt terminal
2. Paste this into the terminal: cd "<full location of the project folder>"
3. Type: .\.venv\Scripts\activate     (This will activate Flask environment)
4. Then type: python app.py  (This will start running the webapp)
5. Copy the address given in the terminal and paste in the browser (usually it will give you: http://127.0.0.1:5000/)

Example endpoints:

1. GET /api/tasks   (This returns all tasks to JSON)
2. POST /api/tasks
   Content-Type: application/json   (Adds a new task)
3. PUT /api/tasks/1
   Content-Type: application/json   (Update a task)
4. DELETE /api/tasks/1   (Deletes a task)

