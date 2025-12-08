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
• koyeb.yaml
• app.py
• schema_app.sql
• static files

2. Login to Render
Go to: https://app.koyeb.com/

3. Create Web Service
• Connect GitHub
• Select your repository
• Use these settings:

Setting	         Value
Service type	   Web service
Source	         Github Repo link
Builder           Buildpack
Environment       Default (No variables, no files)
Instance          Free (0.1 vCPU, 512MB RAM, 2000MB Disk, Frankfurt Server)
Scaling           Default (Autoscaling (0-1 instances/region))
Volumes           Default (No volumes configured)
Ports             8000
Health Checks     Default
Service Name      code


4. Deploy
Koyeb will give a publicly accessible URL.
(If there are changes, deploy with build, if not, use cache)

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
1. POST /api/signup   (This stores username, PW, and name to JSON)
2. POST /api/tasks  (Adds a new task)
3. PUT /api/tasks/1   (Update a task)
4. DELETE /api/tasks/1   (Deletes a task)
5. GET /api/tasks?list_id=5 (Get tasks from a list)
6. POST /api/collab_lists/<list_id>/invite (Invite Existing User to Collaborative List)