pipeline {

    environment {
        branch = 'master'
        scmUrl = 'git@github.com:skalenetwork/skale_manager.git'
    }

    agent {
        dockerfile {
            filename 'docker/truffle/Dockerfile'
        }
    }


    stages {


        stage('Test') {
            steps {
                sh 'truffle test'
            }
        }

    }


    post {
        always {
            slackSend channel: "#jenkins", message: "Build Finished - ${currentBuild.currentResult} ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
        }
    }

}