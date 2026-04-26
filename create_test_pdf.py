#!/usr/bin/env python3
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def create_test_resume():
    filename = "test_resume.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "John Doe")
    
    # Contact info
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, "Email: john.doe@example.com")
    c.drawString(50, height - 100, "Phone: +1-555-123-4567")
    c.drawString(50, height - 120, "Location: San Francisco, CA")
    
    # Experience section
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 160, "Experience")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 190, "Senior Software Engineer")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 210, "Tech Corp Inc. | January 2020 - Present")
    c.drawString(50, height - 230, "• Led development of microservices architecture")
    c.drawString(50, height - 250, "• Implemented CI/CD pipelines")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 280, "Software Developer")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 300, "StartupXYZ | June 2018 - December 2019")
    c.drawString(50, height - 320, "• Built responsive web applications")
    c.drawString(50, height - 340, "• Developed RESTful APIs")
    
    # Education section
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 380, "Education")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 410, "Bachelor of Science in Computer Science")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 430, "University of California, Berkeley | 2014 - 2018")
    c.drawString(50, height - 450, "GPA: 3.8/4.0")
    
    # Skills
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, height - 490, "Skills")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 510, "JavaScript, React, Node.js, Python, AWS, Docker")
    
    c.save()
    print(f"Created {filename}")

if __name__ == "__main__":
    create_test_resume()