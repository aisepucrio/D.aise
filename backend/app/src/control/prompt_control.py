from app.src.model.prompt_model import Prompt
import uuid
from datetime import datetime

class PromptControl:

    def __init__(self):
        self.model = Prompt()

    def list_prompts(self):
        try:
            data = self.model.load_all()

            return {
                "status": 200,
                "data": data
            }

        except Exception as e:
            return {
                "status": 500,
                "error": str(e)
            }

    def get_prompt_by_id(self, prompt_id):
        prompt = self.model.get_prompt_by_id(prompt_id)
        if not prompt:
            return {
                "error": "Prompt not found",
                "status": 404
            }
        return prompt

    def create_prompt(self, data):
        if not data:
            return {
                "status": 400,
                "error": "Invalid payload"
            }

        result = self.model.create_prompt(data)

        if not result["success"]:
            return {
                "status": 400,
                "error": result.get("error", "Failed to save prompt")
            }

        return {
            "status": 200,
            "data": result["data"]
        }

    def set_default(self, data):
        prompt_id = data.get("prompt_id")
        prompt_type = data.get("type")

        if not prompt_id or not prompt_type:
            return {
                "success": False,
                "error": "prompt_id and type are required"
            }, 400

        result = self.model.set_default_prompt(prompt_id, prompt_type)

        if not result["success"]:
            return {
                "success": False,
                "error": result.get("error", "Failed to set default prompt")
            }, 400

        return {
            "success": True,
            "data": result["data"]
        }, 200

    def delete_prompt(self, prompt_id: str):
        try:
            deleted = self.model.delete(prompt_id)

            if not deleted:
                return {
                    "message": "Prompt not found"
                }, 404

            return {
                "message": "Prompt deleted successfully"
            }, 200

        except Exception as e:
            return {
                "message": f"Error deleting prompt: {str(e)}"
            }, 500