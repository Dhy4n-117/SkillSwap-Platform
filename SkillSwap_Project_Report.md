# SkillSwap: Student Skill Exchange Platform
## Project Overview & Working

**SkillSwap** is a full-stack web application designed for university students to trade skills—such as design, coding, tutoring, and project help—without the need for monetary transactions. The platform operates on a peer-to-peer barter and micro-payment system using points. 

### How It Works:
1. **User Registration & Profiles:** Students sign up using their college email, selecting their department, year, and the skills they can offer. They receive an initial balance of 240 points.
2. **Skill Marketplace:** Users can list new skills (e.g., "Figma Prototyping", "React Components") and set a point price for their service. The marketplace is dynamically searchable and filterable by categories.
3. **Real-Time Communication:** When a student finds a skill they want to learn, they can initiate a real-time chat with the provider. This system is powered by Socket.io, allowing instant messaging and negotiation.
4. **Exchange & Transactions:** Once the service is rendered, the receiver clicks "Accept Exchange." The backend dynamically verifies balances, transfers points from the receiver to the provider, tracks the transaction history to prevent duplicates, and updates both users' profiles.
5. **Rating System:** After a successful exchange, students can rate their peers out of 5 stars and leave a comment. This ensures trust and builds a reliable community ecosystem.

---

## Team Contributions

This project was developed collaboratively by a team of four, with each member taking ownership of specific architectural and design components to bring the application to life.

### 1. Lavanya 
**Role:** Lead UI/UX Designer & Frontend Developer
* **Contributions:** Lavanya served as the creative lead for the project. She designed the entire aesthetic of the platform, focusing on creating a premium, modern, and accessible user interface. She established the color palettes, typography (`Playfair Display` and `Plus Jakarta Sans`), and the smooth micro-animations. Lavanya developed the foundational HTML and CSS structures, including the responsive navigation, interactive skill cards, and the visually striking "SkillSwap" logo and authentication screens.

### 2. Soujanya
**Role:** Frontend Logic & SPA Architecture Developer
* **Contributions:** Soujanya was responsible for bringing the static designs to life on the client side. She structured the application as a Single Page Application (SPA) using vanilla JavaScript. Soujanya built the client-side routing logic (`goto()` functions), handled the DOM manipulation for tab switching, and integrated the initial modal interactions (e.g., opening a skill details popup). Her work ensured that the frontend was dynamic and prepared for backend API data integration.

### 3. Sampreeth
**Role:** Backend Authentication Engineer
* **Contributions:** Sampreeth architected the foundation of the backend security and user administration. He developed the initial Node.js & Express server setup and designed the MongoDB `User` schema. Sampreeth implemented secure password hashing using `bcryptjs` and built the robust JSON Web Token (JWT) authentication flow. His endpoints (`/api/auth/register` and `/api/auth/login`) ensure that all subsequent API requests and Socket.io connections are securely gated and verified.

### 4. Dhyan (Team Lead)
**Role:** Full-Stack Integrator, Core API Developer & Deployment Manager
* **Contributions:** As the Team Lead, Dhyan oversaw the unification of the frontend and backend repositories into a cohesive, production-ready full-stack application.
    * **Core APIs:** Built the complex CRUD endpoints for Skills and Ratings, ensuring correct MongoDB schema references.
    * **Real-Time Chat:** Integrated `Socket.io` on both the client and server side, engineering real-time messaging with MongoDB history persistence.
    * **Business Logic & Security:** Engineered the secure point-transfer transaction logic and patched critical API vulnerabilities (e.g., preventing self-rating exploits and mitigating duplicate point-draining bugs).
    * **Deployment:** Containerized backend endpoints, wrote conditional production routing configurations (`IS_DEV` environment variables), established the `.gitignore` security rules, and successfully deployed the entire application live on Render.
