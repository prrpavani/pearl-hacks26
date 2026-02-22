"""
Static image label configuration.

Add an entry here for every image file you place in backend/uploads/.
On startup, these are automatically seeded into MongoDB so the Earn
page can serve them without calling the Gemini API.

Fields:
    filename     – file in backend/uploads/ (must already exist there)
    ground_truth – the single correct label users should select
    wrong_options – exactly 3 plausible-but-wrong labels (list of 3 strings)
"""

STATIC_IMAGE_LABELS = [
    {
        "filename": "pen.jpeg",
        "ground_truth": "ballpoint pen",
        "wrong_options": ["marker", "pencil", "highlighter"],
    },
    {
        "filename": "red_sunset_1.png",
        "ground_truth": "red sunset",
        "wrong_options": ["sunrise", "wildfire smoke", "eclipse"],
    },
    {
        "filename": "redbull.jpeg",
        "ground_truth": "Red Bull energy drink",
        "wrong_options": ["Monster energy drink", "Celsius energy drink", "Gatorade bottle"],
    },
    {
        "filename": "tacos.jpeg",
        "ground_truth": "tacos",
        "wrong_options": ["burritos", "quesadillas", "nachos"],
    },
]
