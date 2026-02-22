## Inspiration

In today’s digital world, young adults spend hours on social media, but rarely gain real-world financial skills. Meanwhile, companies struggle to annotate vast amounts of social data for AI training. We saw an opportunity: what if we could turn social media engagement into a pathway for financial literacy, while helping platforms crowdsource high-quality data annotation?

Earnor bridges this gap: empowering young adults to earn, learn, and contribute, all within the platforms they already use.

## What It Does

Earnor is a multi-tenant B2B SaaS platform that incentivizes users to carry out crowdsourced data annotation tasks on social media. By completing labeling tasks, users earn rewards in SOL (Solana), strengthening their financial literacy and digital wallet skills.

**Key Features:**
- **MCQ Data Annotation:** Users label images and content via MCQ tasks, powered by Gemini 2.5 Flash for ground truth and distractor generation.
- **Wallet Integration:** Seamless Phantom wallet connection for earning and tracking SOL rewards.
- **Financial Literacy Progression:** Task completion unlocks educational modules and real-world payout.
- **Multi-Tenant Architecture:** Social platforms and enterprises can onboard their own users, manage annotation campaigns, and track results.

## How We Built It

**Architecture:**
- **FastAPI Backend:** Handles user sessions, task generation, wallet payouts, and multi-tenant management.
- **MongoDB Atlas:** Stores uploaded images, annotation tasks, user progress, and tenant data.
- **Gemini 2.5 Flash:** Classifies images, generates ground truth labels and distractors for MCQ tasks.
- **Solana Blockchain:** Processes payouts, tracks transactions, and provides transparent reward logs.
- **React Frontend:** User-friendly interface for task completion, wallet connection, and progress tracking.

**Development Timeline:**
- Hour 0-8: Designed multi-tenant structure, set up FastAPI backend, integrated MongoDB for image/task storage.
- Hour 8-16: Built Gemini integration for automated MCQ generation, implemented Solana payout logic, connected Phantom wallet.
- Hour 16-24: Developed React UI for annotation tasks, wallet management, and financial literacy modules. Deployed and tested end-to-end flows.

## Challenges We Faced

- **Automated Distractor Generation:** Ensuring Gemini produces plausible but clearly incorrect MCQ options for robust annotation.
- **Wallet Onboarding:** Making Phantom wallet integration seamless for users new to crypto.
- **Multi-Tenant Data Isolation:** Guaranteeing strict separation between tenants’ data and reward pools.
- **User Engagement:** Designing annotation tasks that are fun, educational, and rewarding.

## What We Learned

- **AI for Education:** Gemini’s multimodal capabilities can drive both annotation quality and user learning.
- **Blockchain for Incentives:** Solana enables instant, transparent rewards, motivating users to participate.
- **Multi-Tenancy at Scale:** B2B SaaS needs robust data isolation and flexible onboarding for diverse clients.

## What's Next

**3-Month Roadmap:**
- Pilot with social media platforms and edtech partners
- Expand annotation types (text, video, sentiment)
- Add gamified financial literacy modules

**6-Month Roadmap:**
- Production Solana mainnet deployment
- Mobile app for annotation and wallet management
- Advanced analytics for tenants

**12-Month Roadmap:**
- Scale to 100K+ users
- Integrate with more social platforms
- Launch global annotation campaigns

## Check Us Out
Check us out here: TBD

## Built With

- FastAPI
- MongoDB Atlas
- Gemini 2.5 Flash
- Solana
- React
- Phantom Wallet
