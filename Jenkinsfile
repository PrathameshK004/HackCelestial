pipeline {
    agent any

    tools {
        nodejs 'NodeJS' // Name of your NodeJS installation configured in Jenkins Global Tool Configuration
    }

    environment {
        CI = 'true'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out latest code from GitHub...'
                checkout scm
            }
        }

        stage('Backend: Install & Syntax Check') {
            steps {
                echo 'Installing Backend dependencies & running sanity checks...'
                dir('Backend') {
                    sh 'npm install'
                    sh 'node -c index.js'
                    sh 'node -c controllers/user.controller.js'
                    sh 'node -c controllers/group.controller.js'
                }
            }
        }

        stage('WebApp: Install & Build') {
            steps {
                echo 'Building WebApp production bundle...'
                dir('WebApp') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                echo 'Archiving compiled WebApp bundle for deployment...'
                archiveArtifacts artifacts: 'WebApp/dist/**', fingerprint: true, allowEmptyArchive: true
            }
        }
    }

    post {
        success {
            echo '🎉 CI/CD Pipeline Succeeded! WebApp build & Backend checks passed.'
        }
        failure {
            echo '❌ Pipeline Failed. Please check build logs above.'
        }
    }
}
