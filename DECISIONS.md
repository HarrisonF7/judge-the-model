# Decisions

<!-- Fill in each section at the step the activity website gives, then commit and push.
     Write each answer after its label. Keep the headings and labels exactly as they are:
     `python -m analysis` reads them. Limit: 150 words for Before results.
     Fill in Recommendations and Design choice and AI use last, once your app is built. -->

## Before results

For each dataset: positive class; which error matters more for the job (missed positive or false alarm) and why.

- readmission: The positive class is patients readmitted to the hospital within 30 days. Missed positives are more important because failing to identify patients at risk could prevent them from receiving additional support and follow-up care.
- diabetes: The positive class is patients with diabetes, defined by a doctor's diagnosis or HbA1c of at least 6.5%. Missed positives are more important because failing to identify patients with diabetes could delay treatment and increase the risk of complications.

## Recommendations

- readmission: None is adequate for this job. Random forest has the highest test AUROC at 0.652, but its training AUROC of 0.997 indicates substantial overfitting. Logistic regression generalizes better, but at the 0.50 threshold it identifies only 1 of 359 positive patients (0.3% sensitivity). None of the models currently provides sufficiently reliable identification of patients at risk.

- diabetes: Logistic regression at a threshold of 0.06. It achieves 97.0% sensitivity, exceeding the 90% target and identifying most patients with diabetes. However, specificity is only 36.9%, precision is 26.5%, and 69.6 patients per 100 are flagged. This creates a substantial number of false alarms, so the model would be more appropriate as an initial screening tool than as a standalone diagnostic system.

## Design choice and AI use

A few sentences each. The design choice must be your own idea, not an AI tool's.

- design choice: I chose to display the confusion matrix and classification errors alongside the performance metrics because the clinical lead needs to understand how many positive patients are missed and how many false alarms the model produces, rather than relying on accuracy alone.

- AI suggestion I turned down: Using the default 0.50 threshold for every model. I did not use this approach because the appropriate threshold depends on the clinical job and the importance of missed positive patients.