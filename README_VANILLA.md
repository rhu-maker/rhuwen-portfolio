1. Get GitHub Projects
Method: GET

Endpoint: /api/projects

What it does: This is a "Proxy" API. Your server contact's GitHub's API to fetch your latest 6 repositories. It then filters that data (taking only the name, stars, language, etc.) and sends it to your frontend.

2. Submit Contact Form
Method: POST

Endpoint: /api/contact

What it does: This handles your "Contact Me" section. It takes the user's name, email, and message, saves them into the contacts table in your SQLite database, and then triggers an automated email to you via Nodemailer.

3. Get Testimonials
Method: GET

Endpoint: /api/testimonials

What it does: This pulls reviews from your database. It specifically only looks for rows where approved = 1, ensuring that random or spam comments don't show up on your website until you allow them.

4. Submit Testimonial
Method: POST

Endpoint: /api/testimonials

What it does: This allows a client to leave a review. The code saves their name, company, and rating into the testimonials table, but sets the approved status to 0 by default so they stay hidden until reviewed.

5. Admin Submissions View
Method: GET

Endpoint: /api/admin/submissions

What it does: This is a private management API. It checks for an ADMIN_KEY (a password) in the URL. If the password is correct, it returns a list of every single contact message and testimonial stored in your database.