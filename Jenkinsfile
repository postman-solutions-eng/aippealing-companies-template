def checkout () {
    context="continuous-integration/jenkins/"
    context += isPRMergeBuild()?"pr-merge/checkout":"branch/checkout"
    def scmVars = checkout scm
    setBuildStatus ("${context}", 'Checking out completed', 'SUCCESS')
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
        stage ('Install newman, portman and postman CLI') {
            steps {
                sh 'curl -o- "https://dl-cli.pstmn.io/install/linux64.sh" | sh'
                sh 'npm install -g newman && npm install -g newman-reporter-html && npm install -g newman-reporter-openapi && npm install -g newman-reporter-postman-cloud && npm install -g newman-reporter-xunit'
                sh 'npm install -g @apideck/portman'
            }
        }

        stage ('Use portman to generated contract tests and run against prod with embedded newman and upload updated collection to Postman') {
            steps {
                sh 'PORTMAN_API_KEY=sk-foobar portman --cliOptionsFile portman-cli.json'
            }
        }

        stage ('Run generated portman contract tests again using standlone newman and staging env and upload run results to Postman') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY'), string(credentialsId: 'JONICO_WORKSPACE_ID', variable: 'WORKSPACE_ID'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID'), string(credentialsId: 'JONICO_POSTMAN_ENV_STAGING', variable: 'POSTMAN_ENV_STAGING')]) {
                    sh 'newman run collection.postman.json -e "https://api.getpostman.com/environments/${POSTMAN_ENV_STAGING}?apikey=${POSTMAN_API_KEY}" --reporters cli,html,openapi,postman-cloud,xunit --reporter-html-export target/pipelineReport.html --reporter-openapi-spec postman/schemas/index.yaml --reporter-apiKey "${POSTMAN_API_KEY}" --reporter-workspaceId ${WORKSPACE_ID} --reporter-integrationIdentifier "${WORKSPACE_ID}-${JOB_NAME}${BUILD_NUMBER}"'
                }
            }
        }

        // also works with collections nested / embedded in an API if you use the collection UID from the Postman URL
        stage ('Run Governance Checks - newman') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY'), string(credentialsId: 'JONICO_WORKSPACE_ID', variable: 'WORKSPACE_ID'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID'), string(credentialsId: 'JONICO_POSTMAN_ENV_MOCK_STAGING', variable: 'POSTMAN_ENV_MOCK_STAGING'), string(credentialsId: 'JONICO_POSTMAN_GOVERNANCE_TESTS_COLLECTION', variable: 'POSTMAN_GOVERNANCE_TESTS_COLLECTION')]) {
                    sh 'newman run "https://api.getpostman.com/collections/${POSTMAN_GOVERNANCE_TESTS_COLLECTION}?apikey=${POSTMAN_API_KEY}" -e "https://api.getpostman.com/environments/${POSTMAN_ENV_MOCK_STAGING}?apikey=${POSTMAN_API_KEY}" --reporters cli,html,openapi,postman-cloud,xunit --reporter-html-export target/pipelineReport.html --reporter-openapi-spec postman/schemas/index.yaml --reporter-apiKey "${POSTMAN_API_KEY}" --reporter-workspaceId ${WORKSPACE_ID} --reporter-integrationIdentifier "${WORKSPACE_ID}-${JOB_NAME}${BUILD_NUMBER}"'
                }
            }
        }

        stage ('Run Integration Tests - newman') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_API_KEY', variable: 'POSTMAN_API_KEY'), string(credentialsId: 'JONICO_WORKSPACE_ID', variable: 'WORKSPACE_ID'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID'), string(credentialsId: 'JONICO_POSTMAN_ENV_STAGING', variable: 'POSTMAN_ENV_STAGING'), string(credentialsId: 'JONICO_POSTMAN_INTEGRATION_TESTS_COLLECTION', variable: 'POSTMAN_INTEGRATION_TESTS_COLLECTION')]) {
                    sh 'newman run "https://api.getpostman.com/collections/${POSTMAN_INTEGRATION_TESTS_COLLECTION}?apikey=${POSTMAN_API_KEY}" -e "https://api.getpostman.com/environments/${POSTMAN_ENV_STAGING}?apikey=${POSTMAN_API_KEY}" --reporters cli,html,openapi,postman-cloud,xunit --reporter-html-export target/pipelineReport.html --reporter-openapi-spec postman/schemas/index.yaml --reporter-apiKey "${POSTMAN_API_KEY}" --reporter-workspaceId ${WORKSPACE_ID} --reporter-integrationIdentifier "${WORKSPACE_ID}-${JOB_NAME}${BUILD_NUMBER}" --iteration-data "data/companies.csv"'
                }
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

        stage ('Run Contract Tests from contract test generator on staging - postman CLI') {
            steps {
                withCredentials([string(credentialsId: 'JONICO_POSTMAN_ENV_CONTRACT_TESTING', variable: 'POSTMAN_ENV_CONTRACT_TESTING'), string(credentialsId: 'JONICO_INTEGRATION_ID', variable: 'INTEGRATION_ID')]) {
                    sh 'postman collection run "postman/collections/(Generator) Contract Tests - OAS3.json" --integration-id "${INTEGRATION_ID}-${JOB_NAME}${BUILD_NUMBER}" -e "${POSTMAN_ENV_CONTRACT_TESTING}" --env-var "env-server=https://aippealing-companies-staging.herokuapp.com"'
                }
            }
        }
    }
    post {
        always {
            publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'target', reportFiles: 'index.html', reportName: 'HTML Report', reportTitles: ''])
            // publish junit test results
            junit 'newman/*.xml'
        }
    }
}