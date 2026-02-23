// ==================== Utility Functions ====================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showMessage(message, type = 'success') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.right = '20px';
    messageEl.style.zIndex = '10000';
    messageEl.style.maxWidth = '400px';
    messageEl.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageEl.remove(), 300);
    }, 5000);
}

function generateStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ==================== Navigation ====================

function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Close menu when link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// ==================== Projects API ====================

async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        
        const projects = await response.json();
        
        if (projects.length === 0) {
            container.innerHTML = '<p class="text-center">No projects found</p>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <div class="project-name">${escapeHtml(project.name)}</div>
                    <div class="project-description">
                        ${project.description ? escapeHtml(project.description) : 'No description'}
                    </div>
                </div>
                <div class="project-body">
                    ${project.language ? `<span class="project-language">${escapeHtml(project.language)}</span>` : ''}
                    <div class="project-stats">
                        <span>⭐ ${project.stars}</span>
                        <span>🍴 ${project.forks}</span>
                    </div>
                    <a href="${escapeHtml(project.url)}" target="_blank" class="project-link">View on GitHub →</a>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<p class="text-center">Error loading projects. Please try again later.</p>';
    }
}

// ==================== Contact Form ====================

function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            subject: document.getElementById('subject').value.trim(),
            message: document.getElementById('message').value.trim()
        };

        // Validation
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.error || 'Failed to send message', 'error');
                return;
            }

            showMessage('Message sent successfully! I\'ll get back to you soon.', 'success');
            contactForm.reset();
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
}

// ==================== Testimonials ====================

async function loadTestimonials() {
    const container = document.getElementById('testimonialsList');
    
    try {
        const response = await fetch('/api/testimonials');
        if (!response.ok) throw new Error('Failed to fetch testimonials');
        
        const testimonials = await response.json();
        
        if (testimonials.length === 0) {
            container.innerHTML = '<p class="text-center">No testimonials yet. Be the first to share one!</p>';
            return;
        }

        container.innerHTML = testimonials.map(testimonial => `
            <div class="testimonial-card">
                <div class="testimonial-stars">${generateStars(testimonial.rating)}</div>
                <div class="testimonial-message">"${escapeHtml(testimonial.message)}"</div>
                <div class="testimonial-author">${escapeHtml(testimonial.name)}</div>
                <div class="testimonial-company">${escapeHtml(testimonial.company)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading testimonials:', error);
        container.innerHTML = '<p class="text-center">Error loading testimonials</p>';
    }
}

function initTestimonialForm() {
    const testimonialForm = document.getElementById('testimonialForm');
    
    if (!testimonialForm) return;

    testimonialForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('testName').value.trim(),
            company: document.getElementById('testCompany').value.trim(),
            message: document.getElementById('testMessage').value.trim(),
            rating: parseInt(document.getElementById('testRating').value)
        };

        // Validation
        if (!formData.name || !formData.message || !formData.rating) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }

        if (formData.rating < 1 || formData.rating > 5) {
            showMessage('Please select a valid rating', 'error');
            return;
        }

        try {
            const response = await fetch('/api/testimonials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.error || 'Failed to submit testimonial', 'error');
                return;
            }

            showMessage('Thank you for your feedback! It will be reviewed and published shortly.', 'success');
            testimonialForm.reset();
            
            // Reload testimonials after a short delay
            setTimeout(() => loadTestimonials(), 1000);
        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred. Please try again.', 'error');
        }
    });
}

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[v0] Portfolio app initialized');
    
    initNavigation();
    initContactForm();
    initTestimonialForm();
    loadProjects();
    loadTestimonials();

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});