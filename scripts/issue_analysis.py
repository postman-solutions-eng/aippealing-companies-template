import requests
import os

# Function to fetch issues from the GitHub repository
def fetch_issues(repo):
    issues_url = f"https://api.github.com/repos/{repo}/issues"
    headers = {"Authorization": f"token {os.getenv('GITHUB_TOKEN')}"}
    response = requests.get(issues_url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to fetch issues. Status code: {response.status_code}")
        return []

# Function to analyze issues and extract Postman environments and companies
def analyze_issues(issues):
    postman_envs = set()
    companies = set()
    for issue in issues:
        comments_url = issue.get("comments_url", "")
        comments_response = requests.get(comments_url)
        if comments_response.status_code == 200:
            comments = comments_response.json()
            for comment in comments:
                body = comment.get("body", "")
                # Extract Postman environments
                if "postman_environment" in body:
                    postman_envs.add(body.split("postman_environment:")[1].split()[0])
                # Extract companies
                if "company:" in body:
                    companies.add(body.split("company:")[1].split()[0])
    return postman_envs, companies

# Main function
def main():
    repo = "postman-solutions-eng/aippealing-companies-template"
    issues = fetch_issues(repo)
    postman_envs, companies = analyze_issues(issues)
    print("Postman Environments:", postman_envs)
    print("Companies:", companies)

if __name__ == "__main__":
    main()
