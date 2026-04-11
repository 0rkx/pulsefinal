# Data Generation & Feature Engineering

Because PulseIQ models complex workplace interactions, raw ingestion mimics realistic signals an HR portal would extract from SaaS suites.

## `generate_data.py` (Synthetic Mocker)
Generates pseudo-random events over several weeks representing workflow:
- **Slack**: Assesses raw messaging habits, mapping messages as Direct Messages vs Work Channels vs Social Channels.
- **Jira**: Generates ticket comments and measures velocity by calculating `story_points` assigned -> resolved.
- **Calendar**: Synthesizes day structures, including start times, attendee counts.
- **Git**: Simulates line additions, deletions, repo interactions, with high likelihoods of weekend or after-hours commits for "stressed" patterns.
- **Zoom**: Measures duration and active speaker engagement.

Outputs dumped to: `pulseiq_data/*_events.csv` (and similar).

## `aggregate_features.py` (Feature Engineering)
Translates the raw chronological payloads into a structured standard: Single Record = `[Employee, Date]`.

### Significant Logic & Algorithms
- **After Hours Filtering:** Employs an explicit boundary (`21:00` to `07:00`) for Git and Slack data to attribute `after_hours_ratio`.
- **RoBERTa NLP Integration:** Leverages the Hugging Face `cardiffnlp/twitter-roberta-base-sentiment` pipeline. Messages are interpreted securely, turning text into floats (1.0 = highly positive, 0.0 = highly negative). 
  - *Fallback*: If the local machine lacks PyTorch or Transformers, it leverages existing synthetic baseline scores.
  - Extrapolates NLP arrays over a day into `slack_sentiment_volatility` (calculates mathematical `std` of mood variance) and `slack_avg_stress_score` (fractional occurrence of trigger words like "overloaded", "swamped", "drowning").
- **Meeting Concentration (Largest Focus Gap):** Sorts meeting intervals arrays per employee. Iterates and calculates the longest continuous block spanning their schedule to measure how fragmented a day really is.
- **Zoom Ratios:** Computes `zoom_speaking_ratio` which divides `speaking_seconds` by overall `duration` across all meetings - acts as a potent model proxy for social withdrawal or disconnection.

Output: `pulseiq_data/daily_features.csv`
