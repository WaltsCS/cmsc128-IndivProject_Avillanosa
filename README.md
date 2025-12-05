The backend I chose is: Flask + SQLite.
I chose this as my backend because it's lightweight, powerful enough for APIs, I was familiar with SQL,
both are easy to use as backend, and there was no server setup needed.


CoDo: Multi-Account To-Do List Web App

Local Installation and Running it Locally
1. Clone the repo:
git clone <repo-url>

2. Create virtual environment:
python -m venv .venv

3. Activate environment:
Windows:
.venv\Scripts\activate
Mac/Linux:
source .venv/bin/activate

4. Install dependencies:
pip install -r requirements.txt

5. Run app:
python app.py

6. Visit:
http://127.0.0.1:5000

If installation was already done, Just open the CMD terminal, and:
a. Paste this into the terminal: cd "<full location of the project folder>"
b. Type: .\.venv\Scripts\activate     (This will activate Flask environment)
c. Then type: python app.py  (This will start running the webapp)
d. Copy the address given in the terminal and paste in the browser 
(usually it will give you: http://127.0.0.1:5000/)



Online Deployment (Render)
1. Push project to GitHub
Must include:
• Procfile
• requirements.txt
• render.yaml
• app.py
• schema_app.sql
• static files

2. Login to Render
Go to: https://render.com/

3. Create Web Service
• Connect GitHub
• Select your repository
• Use these settings:

Setting	         Value
Build Command	   pip install -r requirements.txt
Start Command	   gunicorn app:app
Instance	         Free

4. Add Persistent Disk
Name: data
Path: /opt/render/project/src

5. Deploy
Render will give a publicly accessible URL.

Features Supported on Deployment
• Multi-account login system
• Password hashing
• Personal & collaborative To-Do lists
• Invite members to collaborative lists
• Add / edit / delete tasks
• Undo deletion
• Mobile responsive
• Fully accessible online via a URL



Example endpoints:
1. GET /api/tasks   (This returns all tasks to JSON)
2. POST /api/tasks
   Content-Type: application/json   (Adds a new task)
3. PUT /api/tasks/1
   Content-Type: application/json   (Update a task)
4. DELETE /api/tasks/1   (Deletes a task)