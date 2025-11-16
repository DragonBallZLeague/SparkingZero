# Overall Performance Score - User Guide

## 📊 What is the Overall Performance Score?

The Overall Performance Score is a **single number** that represents how well a character performs in battle. It combines multiple stats into one easy-to-read metric, making it simple to compare characters at a glance.

---

## 🧮 How is it Calculated?

The score is calculated using this **consistent formula** across all views (character aggregation, team data, and filtered results):

```
Base Score = (Damage Dealt / 100,000 × 35%) 
           + (Damage Efficiency × 25%) 
           + (DPS / 1,000 × 25%) 
           + (Health Retention × 15%)

Final Score = Base Score × Experience Multiplier
```

**Note:** The score is displayed as a **whole number** (e.g., 330, 42, 55) for readability, though it's calculated with full precision internally.

### Breaking Down Each Component:

#### 1. **Damage Dealt (35% weight)**
- **Formula Component:** `(Average Damage / 100,000) × 35`
- **What it measures:** Total damage output normalized to a 0-35 scale
- **Why it matters:** Characters that deal more damage are generally more effective
- **Example:** 15,000 average damage → (15,000 / 100,000) × 35 = 5.25 points

#### 2. **Damage Efficiency (25% weight)**
- **Formula:** Damage Dealt ÷ Damage Taken
- **Formula Component:** `Damage Efficiency × 25`
- **What it measures:** How well you trade damage with opponents
- **Example:** 15,000 damage dealt ÷ 10,000 damage taken = 1.5 efficiency → 1.5 × 25 = 37.5 points
- **Why it matters:** Trading damage favorably means you're playing smarter

#### 3. **Damage per Second (25% weight)**
- **Formula:** Damage Dealt ÷ Battle Time
- **Formula Component:** `(DPS / 1,000) × 25`
- **What it measures:** How quickly you deal damage, normalized to a 0-25 scale
- **Example:** 15,000 damage ÷ 120 seconds = 125 DPS → (125 / 1,000) × 25 = 3.125 points
- **Why it matters:** Faster kills mean less time for opponents to counter

#### 4. **Health Retention (15% weight)**
- **Formula:** Remaining Health ÷ Max Health
- **Formula Component:** `Health Retention × 15`
- **What it measures:** How much health you preserve as a percentage
- **Example:** 5,000 HP remaining ÷ 10,000 max HP = 0.5 retention → 0.5 × 15 = 7.5 points
- **Why it matters:** Surviving longer gives you more options in team battles

#### 5. **Experience Multiplier (1.0x to 1.25x)**
- **Based on:** Number of matches played
- **Formula:** `min(1.25, 1.0 + (matchCount - 1) × (0.25 / 11))`
- **Scaling:**
  - 1 match = 1.00x multiplier
  - 2 matches = 1.023x multiplier
  - 5 matches = 1.091x multiplier
  - 10 matches = 1.205x multiplier
  - 12+ matches = 1.25x multiplier (maximum)
- **Why it matters:** More data = More reliable and statistically significant score

### Complete Calculation Example:

Let's calculate a score for a character with:
- Average Damage: 15,000
- Average Damage Taken: 10,000
- Battle Time: 120 seconds
- Health Remaining: 5,000 / 10,000 max
- Matches Played: 10

**Step 1: Calculate components**
```
Damage Component = (15,000 / 100,000) × 35 = 5.25
Efficiency = 15,000 / 10,000 = 1.5
Efficiency Component = 1.5 × 25 = 37.50
DPS = 15,000 / 120 = 125
DPS Component = (125 / 1,000) × 25 = 3.125
Health Retention = 5,000 / 10,000 = 0.5
Health Component = 0.5 × 15 = 7.50
```

**Step 2: Sum base score**
```
Base Score = 5.25 + 37.50 + 3.125 + 7.50 = 53.375
```

**Step 3: Apply experience multiplier**
```
Experience Multiplier = 1.0 + (10 - 1) × (0.25 / 11) = 1.0 + 9 × 0.0227 = 1.205
Final Score = 53.375 × 1.205 = 64.32
Displayed Score = 64 (rounded to whole number)
```

---

## 🎨 Color Coding & Performance Levels

The score receives a **color and icon** based on how it compares to OTHER characters currently displayed:

| Icon | Color | Level | Statistical Range | What It Means |
|------|-------|-------|-------------------|---------------|
| ⭐ | 🟢 Green | **Excellent** | Top 25% (above Q3 + 1.5×IQR) | Outstanding performance |
| 📈 | 🔵 Blue | **Good** | Top 50% (between Q3 and Q3+1.5×IQR) | Above average |
| ➖ | 🟡 Yellow | **Average** | Middle 50% (between Median and Q3) | Typical performance |
| 📉 | 🟠 Orange | **Below Average** | Bottom 50% (between Q1 and Median) | Needs improvement |
| ⚠️ | 🔴 Red | **Poor** | Bottom 25% (below Q1) | Significantly underperforming |

### Understanding the Statistics:

- **Q1 (First Quartile):** 25% of characters score below this point
- **Median:** 50% of characters score below this point (middle value)
- **Q3 (Third Quartile):** 75% of characters score below this point
- **IQR (Interquartile Range):** Q3 - Q1 (represents the middle 50% spread)

**Key Insight:** These are **relative comparisons**, not absolute thresholds. The same score can be "Excellent" in one context and "Poor" in another!

---

## 🔍 How Filtering Changes Performance Levels

**CRITICAL CONCEPT:** The score's color/icon is **RELATIVE** to whoever you're comparing against. Filters change both what's included AND what you're comparing to.

### Real-World Example: Goku Black with Score of 42

Let's track how Goku Black's performance level changes based on filters:

#### **Scenario 1: No Filters (All Characters)**
```
Dataset: All 182 characters in the database
Score Distribution:
  - Range: 15 to 85
  - Q1: 30
  - Median: 40
  - Q3: 55
  - IQR: 25

Goku Black's Score: 42
  - Position: Just above median (50th percentile)
  - Level: 🟡 Yellow "Average"
```

#### **Scenario 2: Filter by "Sparking!" AI Strategy**
```
Dataset: 15 characters using Sparking! AI
Score Distribution:
  - Range: 38 to 50
  - Q1: 40
  - Median: 43
  - Q3: 47
  - IQR: 7

Goku Black's Score: 42
  - Position: Below median (40th percentile)
  - Level: 🟠 Orange "Below Average"
  - Why: Sparking! users generally perform better; Goku Black is below average within this elite group
```

#### **Scenario 3: Filter by "Sparking!" AI + "Primal" Team**
```
Dataset: 3 characters using Sparking! on Primal team
Score Distribution:
  - Scores: [38, 42, 45]
  - Q1: 38
  - Median: 42
  - Q3: 45
  - IQR: 7

Goku Black's Score: 42
  - Position: Exactly at median (50th percentile)
  - Level: 🟡 Yellow "Average"
  - Why: In this very specific context, he's right in the middle
```

#### **Scenario 4: Only Goku Black Selected**
```
Dataset: 1 character
Score Distribution:
  - Not enough data for statistical comparison
  - System defaults to "Average"

Goku Black's Score: 42
  - Position: N/A (no comparison possible)
  - Level: 🟡 Yellow "Average" (default)
  - Why: You need at least 2 characters to compare performance
```

---

## 🎯 Match-Level Filtering (Advanced Feature)

When you filter by **Team** or **AI Strategy**, the system does something powerful: it **RECALCULATES** the score using only the matches that meet your criteria.

### How It Works:

1. **Before Filtering:** Score is based on ALL matches a character played
2. **After Filtering:** Score is recalculated from ONLY the matches that match your filters
3. **Result:** You see how a character performs in that specific context

### Detailed Example: Burter's Performance

#### **Full Stats (No Filters - All 10 Matches)**
```
Match Breakdown:
  - 6 matches with "Combos" AI Strategy
    • Average damage: 18,000
    • Average DPS: 150
  - 4 matches with "Sparking!" AI Strategy
    • Average damage: 12,000
    • Average DPS: 100

Overall Performance:
  - Combined average damage: 16,200
  - Combined average DPS: 135
  - Combined efficiency: 1.5
  - Health retention: 0.45
  - Overall Score: 45
  - Displayed: 45
  - Level: 🟡 Yellow "Average"
```

#### **After Filtering to "Sparking!" AI Only**
```
Now Showing: Only 4 matches where Burter used Sparking! AI

Recalculated Stats:
  - Average damage: 12,000 (down from 16,200)
  - Average DPS: 100 (down from 135)
  - Damage efficiency: 1.3 (recalculated from those 4 matches)
  - Health retention: 0.40 (recalculated from those 4 matches)

Recalculated Score:
  - Base Score = (12,000/100,000)×35 + 1.3×25 + (100/1,000)×25 + 0.40×15
  - Base Score = 4.2 + 32.5 + 2.5 + 6 = 45.2
  - Experience Multiplier = 1.0 + (4-1)×(0.25/11) = 1.0 + 3×0.0227 = 1.068
  - New Score = 45.2 × 1.068 = 48.27
  - Displayed: 48

Comparison: Against OTHER characters' Sparking! AI performance
  - Maybe other Sparking! users have scores of 35-60
  - Burter's 48 might be "Average" in this context

Result: � Yellow "Average"
```

### What Changed?

1. **Match Count:** 10 → 4 (only Sparking! matches)
2. **Stats:** All averages recalculated from 4 matches instead of 10
3. **Score:** 45 → 48 (actually performs better with Sparking! when only those matches are counted!)
4. **Comparison Group:** All characters → Only characters with Sparking! matches
5. **Experience Multiplier:** 1.205x → 1.068x (fewer matches = lower confidence)

**Key Insight:** Burter's overall score was dragged down by poor "Combos" performances. When isolated to just "Sparking!" matches, his score actually improved!

---

## 🎓 Key Takeaways

### 1. **The Score is an Aggregate**
- Combines damage output, efficiency, speed, and survivability
- Weighted toward damage and efficiency (60% combined)
- Uses precise mathematical normalization (dividing by 100,000 for damage, 1,000 for DPS)
- Displayed as whole numbers for readability

### 2. **The Color/Icon is Relative**
- **NOT** based on fixed thresholds (e.g., "40+ is good")
- **IS** based on statistical ranking among currently displayed characters
- Same score can be Excellent, Average, or Poor depending on context

### 3. **Filtering is Powerful**
- **Character Filters:** Change who you're comparing against
- **Team/AI Filters:** Recalculate scores from subset of matches AND change comparison group
- **Performance Filters:** Show only characters in specific performance ranges
- **Match Count Filters:** Control minimum data reliability

### 4. **Formula Consistency**
- **Same formula** used across all views:
  - Aggregated Character Performance
  - Team Character Performances  
  - Filtered Results (when applying Team/AI filters)
- This ensures fair, apples-to-apples comparisons
- Only difference is which matches are included in the calculation

### 4. **Use Cases**

#### **Find Best Overall Character:**
- Remove all filters
- Sort by Combat Score (descending)
- Top character = Best overall performance

#### **Find Best Character for Specific Strategy:**
- Filter by AI Strategy (e.g., "Sparking!")
- Sort by Combat Score (descending)
- Top character = Best performer with that strategy

#### **Compare Two Specific Characters:**
- Select only those two characters
- Look at their scores and stats side-by-side
- Performance levels will be relative to just those two

#### **Analyze Team Performance:**
- Filter by Team name
- See which characters perform best on that team
- Identify optimal team compositions

---

## 🐛 Common Misconceptions

### ❌ "A score of 50 is always good"
**Reality:** A score of 50 might be:
- Excellent (if most characters score 20-40)
- Poor (if most characters score 60-80)
- The level depends on the comparison group!

### ❌ "Filtering just hides characters"
**Reality:** Team/AI filters also:
- Recalculate stats from matching matches only
- Recalculate the score
- Change the comparison group
- Your view is completely recontextualized!

### ❌ "More matches always mean a higher score"
**Reality:** 
- More matches increase the **reliability** (experience multiplier)
- But if those matches were bad performances, the score goes down
- Experience multiplier maxes at 1.25x (12+ matches)

### ❌ "Green star means they're the best"
**Reality:**
- Green star means "Excellent within current view"
- If you're only showing 3 weak characters, one will still get a green star
- Context matters!

---

## 💡 Pro Tips

1. **Always check match count:** Characters with 1-2 matches may have unreliable scores
2. **Use filters to answer specific questions:** Don't just look at overall rankings
3. **Compare like-to-like:** Filter to specific strategies/teams for fair comparisons
4. **Watch for score changes:** If a character's score drops significantly with a filter, they may struggle with that strategy
5. **Look beyond the score:** Expand character details to see individual stat breakdowns

---

## 📊 Statistical Methodology

The analyzer uses **robust statistics** to handle outliers and provide meaningful comparisons:

- **IQR Method:** Uses Interquartile Range instead of standard deviation (less sensitive to extreme outliers)
- **Quartile-Based Levels:** Divides performance into natural statistical groupings
- **Dynamic Thresholds:** Recalculated for each filtered view (no hardcoded cutoffs)
- **Relative Ranking:** Every character is compared to the current dataset

This approach ensures that performance levels are meaningful regardless of:
- How many characters you're viewing
- How diverse the skill levels are
- Whether you're looking at specific strategies or overall performance

---

## 🔗 Related Documentation

- **Character Stats Guide:** Detailed breakdown of individual statistics
- **Filter Guide:** How to use all available filters effectively
- **Meta Analysis Guide:** Understanding team compositions and trends

---

**Last Updated:** October 15, 2025  
**Version:** 2.0 (Match-Level Filtering Update)
