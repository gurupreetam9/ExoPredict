# **App Name**: ExoPredict

## Core Features:

- Model Selection: Allows the user to select between the 'Kepler' and 'TESS' models via a dropdown.
- Dynamic Input Forms: Presents the appropriate input form based on the selected model ('Kepler' or 'TESS'), dynamically showing/hiding fields.
- Data Submission: Submits the input data to the backend API for prediction upon button click. Shows a loading spinner during processing.
- Prediction Results Display: Displays the model's prediction accuracy (%) in a circular progress bar, labeled with the corresponding model name. Radial progress bar animates filling when result loads.
- Data Storage: Stores input data, selected model, prediction results, and timestamps in Firestore for tracking and analysis.
- Prediction Calculation: Utilizes the backend API and the chosen machine learning model to predict the likelihood of exoplanets from given values, returning its confidence as a percentage. The system uses this result as a tool and stores all given inputs and generated outputs to improve performance.
- Error Handling: Implements error handling to gracefully manage backend failures or lack of data, notifying the user appropriately.

## Style Guidelines:

- Primary color: A deep space blue (#243A73) evokes a sense of scientific depth and discovery.
- Background color: A very light grey (#F0F2F5) to provide a clean and uncluttered backdrop.
- Accent color: A vibrant yellow (#FFC857) to highlight key elements like the radial progress bar, progress spinner, and submit button.
- Font: 'Inter', a sans-serif font that looks modern and neutral, to ensure that the numbers and labels on the page remain readable.
- Use clean, minimalist icons to represent input parameters and system status (loading, error).
- Responsive layout adapts to different screen sizes, ensuring a consistent user experience across devices. The main elements of the app are centered, and related functions are presented close to each other to provide maximum efficiency to the user.
- Subtle animations are used during data loading and form transitions to improve user experience.