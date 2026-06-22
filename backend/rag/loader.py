import json
from langchain_core.documents import Document

def load_fia_rules(file_path="backend/data/fia_rules.json"):
    """Loads synthetic FIA regulations and converts them to LangChain Documents."""
    try:
        with open(file_path, "r") as f:
            rules = json.load(f)
        documents = []
        for rule in rules:
            content = f"Rule ID: {rule['rule_id']}\nCategory: {rule['category']}\nTitle: {rule['title']}\nDescription: {rule['description']}"
            metadata = {
                "rule_id": rule["rule_id"],
                "title": rule["title"],
                "category": rule["category"],
                "source_type": "fia_rules"
            }
            documents.append(Document(page_content=content, metadata=metadata))
        return documents
    except Exception as e:
        print(f"Error loading FIA rules: {e}")
        return []

def load_race_reports(file_path="backend/data/race_reports.json"):
    """Loads synthetic race reports and converts them to LangChain Documents."""
    try:
        with open(file_path, "r") as f:
            reports = json.load(f)
        documents = []
        for report in reports:
            content = (
                f"Race: {report['race_name']}\n"
                f"Winner: {report['winner']}\n"
                f"Pole Position: {report['pole_position']}\n"
                f"Fastest Lap: {report['fastest_lap']}\n"
                f"Weather: {report['weather']}\n"
                f"Pit Strategy: {report['pit_strategy']}\n"
                f"Summary: {report['summary']}"
            )
            metadata = {
                "race_name": report["race_name"],
                "winner": report["winner"],
                "weather": report["weather"],
                "source_type": "race_reports"
            }
            documents.append(Document(page_content=content, metadata=metadata))
        return documents
    except Exception as e:
        print(f"Error loading race reports: {e}")
        return []
