# Investigation: Converting Draft PRs to "Ready for Review" Programmatically

## Current Situation
- Admin dashboard can approve/merge PRs
- Draft PRs block the merge process
- Previously attempted automatic conversion failed
- Currently requires manual intervention via GitHub UI

## Methods Investigated

### 1. REST API - PATCH /pulls/{pull_number}
**Endpoint:** `PATCH /repos/{owner}/{repo}/pulls/{pull_number}`
**Payload:** `{ "draft": false }`

**What We Tried:**
- ✅ Using bot token (GITHUB_TOKEN) - FAILED
- ✅ Using user token (OAuth) - FAILED (implied from previous attempts)

**GitHub API Requirements:**
- Only the PR **author** or users with **write/maintain/admin** permissions can convert draft PRs
- Token must have `repo` scope
- API accepts the request but may silently fail or timeout

**Why It Failed:**
- Bot account may not be the PR author
- User OAuth token may not have sufficient permissions
- GitHub may have additional restrictions on programmatic draft conversion
- Draft status changes require webhook/async processing on GitHub's end

---

### 2. GraphQL API - markPullRequestReadyForReview Mutation
**Mutation:** `markPullRequestReadyForReview`

```graphql
mutation {
  markPullRequestReadyForReview(input: {
    pullRequestId: "PR_NODE_ID"
  }) {
    pullRequest {
      isDraft
    }
  }
}
```

**Requirements:**
- Need to convert PR number to Node ID first
- Requires PR author OR write access
- Token needs `repo` scope
- May have same permission issues as REST API

**Advantages:**
- More explicit operation
- Better error messages
- Could handle async state changes better

**Implementation Complexity:**
- Need to fetch PR Node ID first
- Requires GraphQL client setup
- Error handling more complex

**Status:** NOT TESTED - Could be viable alternative

---

### 3. GitHub App Installation Token
**Approach:** Use GitHub App with higher permissions instead of PAT

**Requirements:**
- Create/use GitHub App with proper permissions
- Generate installation token per request
- App needs `pull_requests: write` permission

**Advantages:**
- App tokens have elevated permissions
- Can act as "system" user
- Better security model than PATs

**Disadvantages:**
- Complex setup required
- Need to manage App installation
- Token generation adds latency

**Status:** NOT IMPLEMENTED - Requires infrastructure changes

---

### 4. Impersonate PR Author
**Approach:** Use the PR author's credentials to convert their own draft

**How:**
- When user submits via analyzer, store a temporary token
- Use that token later for draft conversion
- Or: Request additional OAuth scope during admin login

**Requirements:**
- User OAuth token with `repo` scope
- PR author must be the one approving (or delegate permission)

**Issues:**
- Security concerns (storing user tokens)
- Only works if admin = author
- Token expiration

**Status:** POSSIBLE but security concerns

---

### 5. Dedicated "Ready for Review" Endpoint
**Approach:** Create separate endpoint specifically for draft conversion

**Implementation:**
```javascript
// New endpoint: /api/admin/ready-for-review
POST /api/admin/ready-for-review
Body: { prNumber: 123 }

1. Verify user is admin
2. Try GraphQL mutation with user's token
3. Wait and verify conversion succeeded
4. Return success/failure
```

**Advantages:**
- Separates concern from approve flow
- Can retry with better error handling
- User can "prime" the PR before approving

**Status:** NOT IMPLEMENTED - Could work with GraphQL

---

### 6. Webhook-Based Approach
**Approach:** Set up GitHub webhook to auto-convert drafts

**How:**
1. Listen for `pull_request.ready_for_review` webhook
2. Or: Create custom webhook that auto-marks drafts as ready
3. Use webhook secret for authentication

**Issues:**
- Requires webhook infrastructure
- May not apply to existing drafts
- Could auto-convert unintended PRs

**Status:** NOT VIABLE - Too complex for this use case

---

### 7. Browser Automation (Selenium/Puppeteer)
**Approach:** Automate the GitHub UI click

**How:**
- Spin up headless browser
- Navigate to PR page
- Click "Ready for review" button
- Return success

**Issues:**
- Extremely fragile
- Requires browser infrastructure
- GitHub may block automation
- Very slow (5-10 seconds)

**Status:** NOT VIABLE - Anti-pattern

---

### 8. Ask User for Higher OAuth Scope
**Approach:** Request `repo` scope during login with explicit draft conversion permission

**Implementation:**
1. Update OAuth scope in apps/admin to include `repo` (already has it)
2. When converting draft, use user's token
3. Add proper error handling and retry logic

**Current OAuth Scope:**
- Need to verify current scope requested
- May already have `repo` scope

**Why Previous Attempt Failed:**
- Timing issues (3s wait may not be enough)
- Verification logic may have bugs
- Token may not persist draft conversion request

**Potential Fix:**
- Increase wait time to 5-10 seconds
- Add polling to check draft status
- Better error messages from GitHub API

**Status:** MOST VIABLE - Worth re-attempting with improvements

---

## Recommended Solutions (Ranked)

### Solution #1: GraphQL API with User Token (RECOMMENDED)
**Effort:** Medium | **Success Probability:** High

**Implementation Plan:**
1. Create new endpoint: `/api/admin/mark-ready`
2. Use GraphQL mutation instead of REST API
3. Use logged-in user's OAuth token
4. Convert PR number to Node ID
5. Call `markPullRequestReadyForReview` mutation
6. Poll for up to 10 seconds to verify conversion
7. Return clear success/failure

**Code Structure:**
```javascript
// vercel-api/api/admin/mark-ready.js
async function convertToReady(userToken, owner, repo, prNumber) {
  // 1. Get PR Node ID
  const pr = await fetchPR(prNumber);
  const nodeId = pr.node_id;
  
  // 2. Call GraphQL mutation
  const mutation = `
    mutation { 
      markPullRequestReadyForReview(input: { pullRequestId: "${nodeId}" }) { 
        pullRequest { isDraft } 
      } 
    }
  `;
  
  const result = await graphql(mutation, userToken);
  
  // 3. Poll to verify
  for (let i = 0; i < 10; i++) {
    await sleep(1000);
    const updated = await fetchPR(prNumber);
    if (!updated.draft) return true;
  }
  
  return false;
}
```

---

### Solution #2: Improved REST API with Better Retry Logic
**Effort:** Low | **Success Probability:** Medium

**Improvements:**
1. Use user token (not bot token)
2. Increase wait time to 10 seconds
3. Poll every 1 second to check draft status
4. Add exponential backoff
5. Return detailed error if still failing

**Why This Might Work:**
- Previous implementation only waited 3 seconds
- Didn't poll continuously
- May have used wrong token

---

### Solution #3: Two-Step UI Flow
**Effort:** Low | **Success Probability:** High

**Implementation:**
1. Add "Mark Ready" button next to "Approve" for draft PRs
2. User clicks "Mark Ready" first
3. Admin dashboard calls conversion API
4. Shows loading spinner while polling
5. Once ready, enables "Approve" button

**Advantages:**
- Clear user experience
- Handles async nature of conversion
- User understands the process

---

### Solution #4: GitHub App with Installation Token
**Effort:** High | **Success Probability:** Medium-High

**Requirements:**
- Create GitHub App
- Request `pull_requests: write` permission
- Generate installation tokens
- Use installation token for draft conversion

**Only pursue if GraphQL solution fails**

---

## Testing Plan

### If Implementing GraphQL Solution:
1. Create `/api/admin/mark-ready` endpoint
2. Test with user OAuth token
3. Verify Node ID retrieval
4. Test mutation with various PRs
5. Add error handling for permission issues
6. Test polling logic

### Quick Test for REST API:
1. Update wait time to 10 seconds
2. Add polling loop
3. Try with user token
4. Log all intermediate states
5. Check if async completion is the issue

---

## Additional Investigation Needed

1. **Check Current OAuth Scope:** Verify what scope the admin OAuth is requesting
2. **Test Token Permissions:** Use GitHub API to check what the user token can do
3. **Review GitHub API Rate Limits:** Ensure polling won't hit rate limits
4. **Check Bot Token Capabilities:** See if bot token has any special permissions we're missing

---

## Conclusion

**Best Path Forward:**
1. Try Solution #1 (GraphQL) - most likely to work with proper implementation
2. If that fails, try Solution #2 (improved REST with better retry)
3. If both fail, implement Solution #3 (two-step UI) as user-friendly fallback

The key insight is that previous attempts may have failed due to:
- Insufficient wait time for GitHub's async processing
- Using wrong token (bot vs user)
- Not polling to verify conversion
- REST API limitations that GraphQL might not have
