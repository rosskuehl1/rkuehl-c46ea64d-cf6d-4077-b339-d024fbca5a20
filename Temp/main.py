from pathlib import Path

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet

output_path = Path(__file__).with_name("Ross_Kuehl_Resume.pdf")
doc = SimpleDocTemplate(str(output_path))
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("Ross Kuehl", styles['Heading1']))
story.append(Paragraph("Remote • rosskuehl@gmail.com", styles['Normal']))
story.append(Spacer(1, 12))
story.append(Paragraph("Target Role: Staff AI Platform Engineer & Agent Orchestration Lead", styles['Heading2']))
story.append(Spacer(1, 12))

story.append(Paragraph("Professional Summary", styles['Heading2']))
summary = "Full Stack AI Software Engineer with 7+ years of experience building distributed backend systems, AI-enabled applications, REST APIs, and cloud infrastructure. Skilled in Python, C#, React, and AWS with focus on LLM integration, RAG pipelines, and AI agent orchestration. Passionate about scaling intelligent systems from prototype to production."
story.append(Paragraph(summary, styles['Normal']))
story.append(Spacer(1, 12))

story.append(Paragraph("Technical Skills", styles['Heading2']))
skills = [
    "Architectures & Languages: Python, C#, TypeScript/JavaScript, SQL, event-driven design",
    "AI/ML Lifecycle: LLM fine-tuning, agent tooling, RAG pipelines, prompt strategy, vector databases",
    "Backend & Platforms: .NET, FastAPI, Django, gRPC, streaming services, microservices at scale",
    "Frontend & Product: React, design systems, real-time data visualizations",
    "Cloud & DevOps: AWS (Lambda, ECS, S3, API Gateway, SageMaker), Docker, Terraform, CI/CD (GitHub Actions)",
    "Data & Storage: PostgreSQL, DynamoDB, Redis, lakehouse patterns",
    "Delivery Practices: Technical leadership, security-first design, automated testing, observability"
]
story.append(ListFlowable([ListItem(Paragraph(s, styles['Normal'])) for s in skills]))
story.append(Spacer(1, 12))

story.append(Paragraph("Professional Experience", styles['Heading2']))

exp1 = [
    "Architected cloud-native backend systems using Python and AWS.",
    "Built REST APIs and AI data pipelines to power automation.",
    "Integrated LLM services to enhance product intelligence.",
    "Standardized CI/CD with Docker to improve deployment reliability."
]
story.append(Paragraph("Senior Software Engineer — Stealth Startup (Dec 2022 – Present)", styles['Heading3']))
story.append(ListFlowable([ListItem(Paragraph(e, styles['Normal'])) for e in exp1]))
story.append(Spacer(1, 6))

exp2 = [
    "Developed distributed backend services in C# and Python for warehouse automation.",
    "Optimized API latency and improved system throughput.",
    "Led AWS migration for legacy systems.",
    "Mentored developers in testing and system design."
]
story.append(Paragraph("Senior Software Engineer — AutoStore (Jun 2019 – Dec 2022)", styles['Heading3']))
story.append(ListFlowable([ListItem(Paragraph(e, styles['Normal'])) for e in exp2]))
story.append(Spacer(1, 6))

exp3 = [
    "Built full-stack apps for manufacturing and logistics.",
    "Automated reporting, reducing manual effort by 40%.",
    "Designed SQL schemas and optimized stored procedures."
]
story.append(Paragraph("Software Engineer — Shaw Industries (Jun 2017 – Jun 2019)", styles['Heading3']))
story.append(ListFlowable([ListItem(Paragraph(e, styles['Normal'])) for e in exp3]))
story.append(Spacer(1, 12))

story.append(Paragraph("Education", styles['Heading2']))
story.append(Paragraph("Bachelor of Science – Business Administration, Longwood University (May 2017)", styles['Normal']))

doc.build(story)

