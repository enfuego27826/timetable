# Timetable Application

This is a web-based timetable application that allows users to view and filter personalized timetables using CSV files. The application is built with Python and Flask, and supports deployment on platforms like Heroku using Docker.

## Features

- Upload and process timetable CSV files
- Filter timetables based on user input
- Download updated or personalized timetables
- Simple web interface with custom styles and images

## Project Structure

- `app.py`: Main Flask application
- `scripts/csv-filter.py`: Script for filtering CSV files
- `static/`: Static assets (CSS, JS, images)
- `templates/`: HTML templates
- `requirements.txt`: Python dependencies
- `DockerFile`, `Procfile`, `runtime.txt`: Deployment configuration
- CSV files: Sample and processed timetable data

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd timetable
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and go to `http://localhost:5000`

### Docker

To run with Docker:
```
docker build -t timetable-app .
docker run -p 5000:5000 timetable-app
```

## Usage

- The generator and course suggestions load `Timetable, Sem-II, 2026-27 - Time table.csv` directly. Restart the app after updating this file.
- Run `python csv_filter.py` to export the current semester's data to `Updated_Processed_Timetable.csv` when needed. The app does not depend on this generated file or the legacy `Timetable.csv`.
- Access the web interface to upload or filter timetables.
- Download the processed timetable as needed.

## GitHub Pages

The Pages version runs entirely in the browser, including clash checks and image, Excel, CSV, and calendar downloads. Calendar downloads ask for the semester start date and repeat classes for 16 weeks in the India timezone.

Build locally with `python scripts/build_pages.py`, then serve `dist/` with any static HTTP server. Run `node scripts/test_pages.cjs` after building to check course generation, suggestions, calendar output, and project-relative asset paths.

The hosted fork publishes the contents of `dist/` from the root of its `gh-pages` branch. After changing the source CSV, rebuild and publish the updated static output to that branch. In repository Settings → Pages, select **Deploy from a branch**, `gh-pages`, and `/ (root)`.

## License

This project is licensed under the MIT License.
