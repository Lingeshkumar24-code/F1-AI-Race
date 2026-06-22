# MCA Generative AI Specialization: Viva Preparation Guide
## 50 Technical Questions and Answers for the "F1 AI Race Engineer" Project

---

### Category 1: Retrieval Augmented Generation (RAG)

#### Q1: What is Retrieval Augmented Generation (RAG), and why is it used in this project?
**Answer:** RAG is a technique that extends the capabilities of Large Language Models (LLMs) by retrieving relevant information from an external knowledge base (in this case, ChromaDB containing FIA Sporting Regulations and historical race summaries) and feeding it as context to the LLM. It is used because LLMs alone suffer from hallucinations, lack project-specific real-time domain knowledge, and cannot accurately quote specific legal/sporting clauses of FIA regulations.

#### Q2: Explain the step-by-step pipeline of your RAG implementation.
**Answer:** 
1. **Loading:** The JSON datasets (FIA rules and race reports) are read by `loader.py` and wrapped into LangChain `Document` objects.
2. **Chunking:** `chunker.py` uses `RecursiveCharacterTextSplitter` to break long texts into overlapping blocks.
3. **Embedding:** `embeddings.py` passes text chunks to `sentence-transformers/all-MiniLM-L6-v2` to compute vector representations.
4. **Storage:** Chunks are saved in ChromaDB vector database collections at `backend/chroma_db`.
5. **Retrieval:** During query runtime, user intent triggers a similarity search. Matching documents are retrieved and formatted as text.
6. **Augmentation:** The context is appended to the system prompt and sent to Groq.

#### Q3: What chunking strategy did you use, and why did you choose it?
**Answer:** We used LangChain's `RecursiveCharacterTextSplitter` with a `chunk_size` of 600 characters and a `chunk_overlap` of 120 characters. The recursive splitter splits text by looking at paragraphs, sentences, and words sequentially to keep semantic context intact. The 120-character overlap (20%) ensures that if a critical rule or sentence falls on a boundary, the semantic connection is preserved in adjacent chunks.

#### Q4: How does RAG solve the problem of LLM hallucinations in F1 strategy advice?
**Answer:** Without RAG, asking an LLM about safety car procedures could lead to it hallucinating arbitrary rules. By forcing the LLM to write responses using only retrieved documents (e.g. Article 39.1 of the Sporting Regulations), we ground the LLM in factual context. The prompt explicitly instructs the LLM: "Answer the driver using the retrieved context; if you do not know the answer, state that telemetry is offline."

#### Q5: What is the difference between Naive RAG and Agentic RAG, and which one does this project use?
**Answer:** Naive RAG follows a fixed sequence: Query -> Retrieve -> Generate. Agentic RAG (which this project uses via LangGraph) adds a decision-making layer. The agent evaluates if RAG retrieval is even necessary, determines what query keywords to search, decides which collection (rules or reports) to query, and can iteratively refine its query or combine RAG facts with ML model predictions.

---

### Category 2: Vector Databases & ChromaDB

#### Q6: What is a Vector Database, and why did you choose ChromaDB?
**Answer:** A vector database stores data as high-dimensional mathematical coordinates (embeddings) rather than rows and columns. It uses algorithms like Cosine Similarity or HNSW (Hierarchical Navigable Small World) to perform fast similarity searches. ChromaDB was chosen because it is open-source, lightweight, embeds easily in Python, supports local persistence on disk, and integrates out-of-the-box with LangChain.

#### Q7: How does ChromaDB store and persist vector data?
**Answer:** ChromaDB uses SQLite under the hood to store metadata and documents, and uses the `hnswlib` C++ library to build and search vector indexes. In our backend, the database is persisted to the local directory `backend/chroma_db` using Chroma's `PersistentClient` implementation, ensuring vectors don't vanish when the container restarts.

#### Q8: What are embeddings, and why is the model `all-MiniLM-L6-v2` selected?
**Answer:** Embeddings are vector lists of numbers representing the semantic meaning of text. The `sentence-transformers/all-MiniLM-L6-v2` model is a lightweight, widely adopted model that maps sentences to 384-dimensional dense vectors. It has a great balance between accuracy, memory footprint, and CPU speed, allowing us to generate vector databases fast without needing expensive GPU resources.

#### Q9: How does metadata filtering work in ChromaDB?
**Answer:** When storing documents, we attach metadata tags like `{"source_type": "fia_rules"}` or `{"source_type": "race_reports"}`. During a query, we pass a filter object (e.g. `{"source_type": "fia_rules"}`) to the Chroma search method. Chroma restricts the distance calculations to vectors matching the metadata filter, preventing cross-contamination between rules and race reports.

#### Q10: How do you handle database updates or indexing changes in ChromaDB?
**Answer:** Chroma collections support CRUD operations. If rules or summaries change, we retrieve the collection using `get_or_create_collection` and invoke `upsert` with the modified document chunks, embedding lists, and IDs. For major updates, we run our `build_vector_db()` script to delete the existing collection directory and rebuild it clean.

---

### Category 3: LangChain Framework

#### Q11: What is LangChain, and what is its role in your project?
**Answer:** LangChain is a framework designed to build LLM applications. In our project, it coordinates the pipeline: it wraps our embeddings, structures custom documents, wraps the Groq LLM client, and defines the format of inputs and outputs using base message interfaces (e.g. `SystemMessage`, `HumanMessage`, `AIMessage`).

#### Q12: How does LangChain handle LLM integration, specifically for Groq?
**Answer:** LangChain provides a dedicated integration package `langchain-groq` containing the `ChatGroq` class. `ChatGroq` automatically handles authentication via `groq_api_key`, formats parameters like temperature and max tokens, and compiles messages into Groq's API-compliant JSON format.

#### Q13: What is the concept of a "Document" in LangChain?
**Answer:** In LangChain, a `Document` is a standard object containing two primary attributes: `page_content` (a string representing the raw text) and `metadata` (a dictionary containing structured tags like source, title, date, etc.). Using this uniform object enables smooth handoffs between loaders, text splitters, and vector stores.

#### Q14: Why did you use SystemMessage and HumanMessage in LangChain instead of plain strings?
**Answer:** Chat models like Llama 3.3 are trained on structured chat protocols. A `SystemMessage` sets the assistant's persona, boundaries, and rules (e.g., acting as an F1 engineer). A `HumanMessage` contains the driver's queries. Using these classes structures the context correctly, ensuring the model respects its instructions.

#### Q15: How does LangChain support custom tools?
**Answer:** LangChain allows wrapping standard Python functions into runnable Tools. These tools have schema definitions (name, description, argument types) which are automatically converted to JSON schemas and sent to the LLM during tool-calling requests.

---

### Category 4: LangGraph Agentic Framework

#### Q16: What is LangGraph, and how does it differ from standard LangChain chains?
**Answer:** LangChain chains are directed acyclic graphs (DAGs) representing a fixed, linear execution. LangGraph is a stateful agentic framework that allows defining cyclic workflows with loops and conditionals. In this project, it maintains state across nodes, allowing an agent to detect intent, execute tools, retrieve from vector databases, and generate a response, returning to a state node if needed.

#### Q17: What is "State" in LangGraph, and how is it managed in your project?
**Answer:** In LangGraph, the State is a shared, key-value memory data structure passed between nodes. In our project, `AgentState` is defined as a `TypedDict` containing the conversation history (`messages` with a reducer to append new messages), detected `intent`, `resolved_inputs` dictionary, `tool_output` string, and `final_response` string.

#### Q18: Describe the structure of your LangGraph state graph.
**Answer:** Our workflow uses a sequential state graph:
1. **START Node** directs execution to the `detect_intent` node.
2. **detect_intent Node:** Uses LLM in JSON mode to classify query and parse arguments, updating the state.
3. **execute_tool Node:** Inspects the intent, executes the matching Python utility or RAG lookup, and writes the output string to the state.
4. **generate_answer Node:** Synthesizes the final markdown radio transmission using the driver history and tool outputs.
5. **END Node** stops the graph.

#### Q19: How does LangGraph handle loops or conditional routing?
**Answer:** LangGraph supports conditional edges using `workflow.add_conditional_edges()`. A router function inspects the state (for example, checking if a tool call was successful) and returns the name of the next node. In our graph, we kept it linear but structured to guarantee execution efficiency.

#### Q20: Why is state persistence (memory) important in an AI F1 Race Engineer?
**Answer:** F1 race strategy is context-dependent. If the driver asks "Should I pit?", and then follows up with "What tires should we put on?", the agent must remember the previous recommendation, current lap, and tyre status. LangGraph's message history reducer saves this context, making continuous conversation possible.

---

### Category 5: Large Language Models & Groq

#### Q21: What is Groq, and what makes it suitable for real-time race simulations?
**Answer:** Groq is an AI infrastructure company that built the LPU (Language Processing Unit), a specialized chip designed for ultra-high inference speeds. For an F1 Race Engineer application, latency is critical. Groq compiles and runs models like Llama 3.3 in fractions of a second, producing output tokens fast enough to simulate live radio telemetry feeds.

#### Q22: Why did you choose the model `llama-3.3-70b-versatile`?
**Answer:** Llama 3.3 70B is a state-of-the-art open-source LLM. The "versatile" variant is highly capable of complex reasoning tasks, structured JSON extraction, and tool execution, matching the quality of proprietary models like GPT-4 while running at the extreme speeds provided by Groq.

#### Q23: How do you configure Groq to return structured JSON data?
**Answer:** In our `detect_intent` node, we call `get_llm(json_mode=True)`. This passes the argument `response_format={"type": "json_object"}` to the Groq API. In addition, our system prompt enforces that the response must be a JSON object containing the `intent` and `args` keys.

#### Q24: What is the "temperature" parameter in LLM invocation, and what value did you use?
**Answer:** Temperature controls the randomness of token generation. A high temperature (e.g. 0.9) produces creative outputs. A low temperature (e.g. 0.1) makes the model deterministic and analytical. We used `0.1` because a Race Engineer must be precise, logical, and rely strictly on telemetry facts.

#### Q25: How do you handle Groq API rate limits or connection dropouts?
**Answer:** In our backend code, we wrap model invocations in try-except blocks. If the Groq API fails or times out, the code catches the exception and returns a fallback message ("Radio transmission disrupted") rather than crashing the FastAPI backend.

---

### Category 6: Synthetic Dataset Creation

#### Q26: Why is synthetic data generation necessary for this project?
**Answer:** Detailed F1 telemetry, lap-by-lap tire degradation, and internal race engineer logs are highly proprietary and not publicly available in structured databases. Creating a synthetic dataset generator allowed us to build custom databases containing realistic data for training ML models and testing RAG.

#### Q27: How did you simulate realistic physics in the telemetry dataset (Dataset A)?
**Answer:** We wrote mathematical formulas incorporating real F1 parameters:
- **Base laps:** Monaco has slow, short laps (75s); Spa has long, high-speed laps (108s).
- **Tire compounds:** Soft compounds decrease lap times by 0.8s but degrade fast. Hard compounds are 0.8s slower but degrade slowly.
- **Fuel load:** Cars burn 1.6kg of fuel per lap. As weight decreases, cars get faster by 0.035s per kg.
- **Weather:** Rainy conditions add a baseline of 12.0s to lap times.
- **Noise:** We added Gaussian random noise (`np.random.normal`) to mimic driver errors.

#### Q28: Explain how you calculated the "Position" column dynamically during generation.
**Answer:** In `generate_data.py`, we simulated the race lap-by-lap. We initialized drivers in their qualification order and tracked their accumulated race time. At the end of each lap, we sorted the drivers by their total accumulated time and assigned positions (1st to 10th) dynamically, reflecting the impact of pace and pit stop delays.

#### Q29: What is the structure of Dataset B (Tire Degradation), and how is it used?
**Answer:** Dataset B contains 20,000 samples of tire testing data. Columns include `compound`, `lap_age`, `track_temp`, `degradation_percent`, and `lap_time_loss`. It maps the non-linear relationship between tire age, temperature, and wear, and is used to train our Random Forest Regressor.

#### Q30: How did you generate the 500 synthetic FIA regulations (Dataset C)?
**Answer:** We built structured templates for seven categories (Safety Car, VSC, Pit Stops, etc.) containing real sporting concepts. We then ran a loop to generate 500 rules by randomly combining titles, articles, clauses, and sub-clauses. This created a dense text dataset containing legal terminology suitable for testing RAG accuracy.

---

### Category 7: Machine Learning Models

#### Q31: What ML algorithm is used for tire degradation, and why?
**Answer:** We used a `RandomForestRegressor` from `scikit-learn`. Tire degradation is non-linear and depends on interactions between variables (e.g. high track temperature accelerates wear on Softs, but has a smaller impact on Hards). Random Forest handles non-linear relationships and interactions without needing feature scaling, and generalizes well without overfitting.

#### Q32: What ML algorithm is used for pit stop recommendation, and why?
**Answer:** We used an `XGBoost Classifier`. Determining whether to pit is a binary classification problem (PIT vs. NO_PIT). XGBoost (Extreme Gradient Boosting) is a powerful gradient-boosted decision tree algorithm that excels on tabular datasets. It handles class imbalance well and creates highly accurate decision boundaries.

#### Q33: How do you address the class imbalance in the Pit Stop dataset?
**Answer:** In a standard race, drivers pit on only 1 or 2 laps out of 50, making the "PIT" label rare (around 3% of the dataset). To prevent the classifier from always predicting "NO_PIT", we calculated the imbalance ratio in `train_ml.py` and passed it as the `scale_pos_weight` parameter to the XGBoost model. This scales the loss function, penalizing misclassified pit decisions.

#### Q34: What features are passed to the Tire Degradation model?
**Answer:** The features are:
1. `lap_age` (integer): How many laps the current tire has run.
2. `compound_code` (mapped integer: Soft=0, Medium=1, Hard=2).
3. `track_temp` (float): The current track temperature in °C.

#### Q35: How do you deploy and run these trained models in the backend?
**Answer:** The models are saved as pickle files (`models/tire_model.pkl` and `models/pitstop_model.pkl`) using `joblib`. During backend startup, the FastAPI app loads the models into memory. When the `/predict-tire` or `/recommend-pit` endpoints are called, the app maps the input variables, creates a Pandas DataFrame, and calls `.predict()` or `.predict_proba()` to return the prediction.

---

### Category 8: FastAPI Backend

#### Q36: What is FastAPI, and what advantages does it offer for this project?
**Answer:** FastAPI is a modern, high-performance web framework for building APIs in Python. It offers:
- **Speed:** It is built on ASGI (uvicorn) and is as fast as Node.js or Go.
- **Auto Documentation:** It automatically generates interactive OpenAPI/Swagger docs.
- **Pydantic Validation:** It validates incoming JSON payloads using Python type hints, returning clear errors if inputs are invalid.

#### Q37: List the primary API endpoints exposed by your backend.
**Answer:** 
- `POST /chat`: Runs the LangGraph agent.
- `POST /predict-tire`: Explicit tire degradation prediction.
- `POST /recommend-pit`: Pit stop decision classifier.
- `POST /compare-drivers`: Teammate performance comparison.
- `POST /fia-assistant`: RAG Sporting rules assistant.
- `POST /generate-report`: RAG past race summaries.
- `GET /dashboard-stats`: Telemetry data aggregates.

#### Q38: How does the `/dashboard-stats` endpoint compile metrics?
**Answer:** It connects to the SQLite database `f1_race_data.db` and runs SQL queries:
- `COUNT(*)` to get total data points.
- `AVG(lap_time)` grouped by compound to evaluate average pace.
- `COUNT(*)` grouped by compound to calculate tire allocation.
- Lap-by-lap averages for track 'Monza' to draw the degradation curves.
It packages these values into a JSON response to render the dashboard.

#### Q39: What is CORS, and why did you enable it in FastAPI?
**Answer:** CORS stands for Cross-Origin Resource Sharing. By default, browsers block web pages (e.g. React running on port 3000) from making API requests to a different domain or port (e.g. FastAPI on port 8000). We added FastAPI's `CORSMiddleware` with `allow_origins=["*"]` to allow the React app to communicate with the backend.

#### Q40: How does SQLite support the backend alongside ChromaDB?
**Answer:** We use both databases for different tasks:
- **SQLite** handles structured, tabular telemetry data. It is excellent for running aggregations, filters, and mathematical averages.
- **ChromaDB** handles unstructured text data. It is excellent for semantic search, document chunk retrieval, and RAG pipelines.

---

### Category 9: React Frontend & Visualizations

#### Q41: Explain the structure of your React frontend application.
**Answer:** The frontend is a Single Page Application (SPA) built with Vite and Tailwind CSS:
- `src/main.jsx`: Application entrypoint.
- `src/App.jsx`: Global layout, managing the F1 carbon-fiber sidebar and tab state.
- `src/services/api.js`: Axios configuration and API endpoints handler.
- `src/pages/`: Page components for Dashboard, Chat, Strategy, Driver Compare, FIA, and Reports.

#### Q42: What visualization library did you use, and why?
**Answer:** We used **Recharts**. Recharts is a composable library built on React components and D3. It is ideal for dashboards because it is responsive, fits perfectly with Tailwind styling, and supports modern tooltips and animations.

#### Q43: How does the Strategy Analyzer visualize tire degradation?
**Answer:** When the user adjusts inputs, the page calculates a projected 40-lap degradation curve using F1 physics formulas. It passes this data array to a Recharts `AreaChart` with a red gradient fill, plotting degradation percentage against tire age alongside a dotted line representing the critical wear limit.

#### Q44: How does the Driver Comparison page parse text telemetry into charts?
**Answer:** The `/compare-drivers` endpoint returns a formatted text report from the SQLite database. In the React frontend, we use regular expressions (regex) to parse the average sector splits (S1, S2, S3) from the text and populate a Recharts `BarChart` comparing the drivers side-by-side.

#### Q45: How did you implement the dark themed UI in React?
**Answer:** We used Tailwind CSS with a custom F1 palette. In `tailwind.config.js`, we defined color tokens like `f1-carbon` (#15151e), `f1-red` (#e10600), and `f1-gold`. In `index.css`, we created a carbon background using gradient grids and blur backdrops (`backdrop-filter`) to build a premium glassmorphic dashboard.

---

### Category 10: Docker Deployment & Systems Architecture

#### Q46: Explain the Docker deployment architecture of this project.
**Answer:** The project uses a multi-container Docker architecture orchestrated by `docker-compose.yml`:
1. **Backend Container:** Runs Python 3.10, installs PyPI packages, runs data simulation, trains the ML models, indexes vectors, and runs the FastAPI server.
2. **Frontend Container:** Uses Nginx to serve the static production bundle of the React app compiled during the build stage.

#### Q47: Why is Nginx used in the frontend Docker container instead of running Vite dev server?
**Answer:** Vite's development server is not optimized for production. Using Nginx (a high-performance reverse proxy and web server) ensures static files (HTML, CSS, JS) are served fast, consumes very little memory, and is standard practice for deploying web applications.

#### Q48: What is the purpose of Volumes in your `docker-compose.yml`?
**Answer:** Volumes mount persistent storage folders on the host machine to directories inside the containers. We defined volumes for `backend_data`, `backend_models`, and `backend_chromadb` to ensure that the SQLite database, pickled ML models, and vector collections persist even if the containers are stopped or deleted.

#### Q49: How does the frontend container communicate with the backend container?
**Answer:** When the user accesses the React app in their browser, the Axios client makes requests to `http://localhost:8000`. The browser resolves this address to port 8000 on the host machine, which Docker forwards to the backend container's exposed port 8000.

#### Q50: How do you start the entire F1 AI Race Engineer application with a single command?
**Answer:** By running the command:
```bash
docker compose up --build
```
This commands tells Docker Compose to build the Dockerfiles for the frontend and backend, configure the network and volumes, and launch both containers, starting the full application on ports 3000 (React) and 8000 (FastAPI).
