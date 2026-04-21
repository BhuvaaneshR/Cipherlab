from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

load_dotenv()
from analysis import analysis_blueprint
from auth import auth_blueprint


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ]
            }
        },
    )
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(analysis_blueprint)

    @app.get("/health")
    def health_check():
        return jsonify({"status": "ok", "service": "cipherlab-backend"}), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
