def checkout () {
    context="continuous-integration/jenkins/"
    context += isPRMergeBuild()?"pr-merge/checkout":"branch/checkout"
    def scmVars = checkout scm
    //setBuildStatus ("${context}", 'Checking out completed', 'SUCCESS')
    if (isPRMergeBuild()) {
      prMergeRef = "refs/pull/${getPRNumber()}/merge"
      mergeCommit=sh(returnStdout: true, script: "git show-ref ${prMergeRef} | cut -f 1 -d' '")
      echo "Merge commit: ${mergeCommit}"
      return [prMergeRef, mergeCommit]
    } else {
      return ["refs/heads/${env.BRANCH_NAME}", scmVars.GIT_COMMIT]    
    }
}

def isPRMergeBuild() {
    return (env.BRANCH_NAME ==~ /^PR-\d+$/)
}

def getPRNumber() {
    def matcher = (env.BRANCH_NAME =~ /^PR-(?<PR>\d+)$/)
    assert matcher.matches()
    return matcher.group("PR")
}

void setBuildStatus(context, message, state) {
  step([
      $class: "GitHubCommitStatusSetter",
      contextSource: [$class: "ManuallyEnteredCommitContextSource", context: context],
      errorHandlers: [[$class: "ChangingBuildStatusErrorHandler", result: "UNSTABLE"]],
      reposSource: [$class: "ManuallyEnteredRepositorySource", url: "https://octodemo.com/${getRepoSlug()}"],
      statusResultSource: [ $class: "ConditionalStatusResultSource", results: [[$class: "AnyBuildResult", message: message, state: state]] ]
  ]);
}

pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: shell
    image: node
    command:
    - sleep
    args:
    - infinity
'''
            defaultContainer 'shell'
        }
    }
    stages {
        stage('Checkout code') {
            steps {
                checkout scm
            }
        }
        stage ('Install newman and postman CLI') {
            steps {
            
                sh 'curl -o- "https://dl-cli.pstmn.io/install/linux64.sh" | sh'
                sh 'npm install -g newman && npm install -g newman-reporter-html && npm install -g newman-reporter-openapi && npm install -g newman-reporter-postman-cloud'
            }
        }

        stage ('Login - postman CLI') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY')]) {
                    sh 'postman login --with-api-key $POSTMAN_API_KEY'
                }
                
            }
        }

        stage ('Run API Linting - postman CLI') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID')]) {
                    sh 'postman api lint --integration-id $INTEGRATION_ID'
                }
            }
        }

        stage ('Run Contract Tests on staging - postman CLI') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_ENV_CONTRACT_TESTING', variable: 'POSTMAN_ENV_CONTRACT_TESTING'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID')]) {
                    sh 'postman collection run "postman/collections/(Generator) Contract Tests - OAS3.json" --integration-id "${INTEGRATION_ID}-${JOB_NAME}${BUILD_NUMBER}" -e "${POSTMAN_ENV_CONTRACT_TESTING}" --env-var "env-server=https://aippealing-companies-staging.herokuapp.com"'
                }
            }
        }

        stage ('Run integration tests on staging - postman CLI') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_ENV_STAGING', variable: 'POSTMAN_ENV_STAGING'), string(credentialsId: 'JONICO_POSTMAN_INTEGRATION_TESTS_COLLECTION', variable: 'POSTMAN_INTEGRATION_TESTS_COLLECTION')]) {
                    sh 'postman collection run "${POSTMAN_INTEGRATION_TESTS_COLLECTION}" -e "${POSTMAN_ENV_STAGING}" --iteration-data "data/companies.csv"'   
                }
            }
        }

        stage ('Run Governance Checks - newman') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY'), string(credentialsId: 'JONICO_WORKSPACE_ID', variable: 'WORKSPACE_ID'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID')]) {
                    sh 'newman run "postman/collections/Governance Checks.json" --reporters cli,html,openapi,postman-cloud --reporter-html-export target/pipelineReport.html --reporter-openapi-spec postman/schemas/schema.yaml --reporter-apiKey "${POSTMAN_API_KEY}" --reporter-workspaceId ${WORKSPACE_ID} --reporter-integrationIdentifier "${WORKSPACE_ID}-${JOB_NAME}${BUILD_NUMBER}"'
                }
                
            }
        }

        stage('Publish newman reporter results') {
            steps {
                publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'target', reportFiles: 'index.html', reportName: 'HTML Report', reportTitles: ''])
            }
        }
    }
}