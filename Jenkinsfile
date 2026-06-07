pipeline {
  agent any

  parameters {
    choice(name: 'TARGET_ENV', choices: ['dev', 'test', 'prod'], description: 'Environment to deploy')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Deploy to AWS ECS after build')
  }

  environment {
    AWS_CREDENTIALS_ID = 'aws-jenkins-credentials'
    AWS_ACCOUNT_ID = credentials('aws-account-id')
  }

  stages {
    stage('Load Environment') {
      steps {
        script {
          def envFile = "config/${params.TARGET_ENV}.env"
          def values = readProperties file: envFile
          env.APP_ENV = values.APP_ENV
          env.AWS_REGION = values.AWS_REGION
          env.AWS_ECR_REPOSITORY = values.AWS_ECR_REPOSITORY
          env.AWS_ECS_CLUSTER = values.AWS_ECS_CLUSTER
          env.AWS_ECS_SERVICE = values.AWS_ECS_SERVICE
          env.AWS_ECS_TASK_FAMILY = values.AWS_ECS_TASK_FAMILY
          env.DB_CLIENT = values.DB_CLIENT
          env.DB_SSL = values.DB_SSL
          env.DB_POOL_MAX = values.DB_POOL_MAX
          env.ECR_REGISTRY = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
          env.IMAGE_TAG = "${env.BUILD_NUMBER}-${(env.GIT_COMMIT ?: 'local').take(7)}"
          env.IMAGE_URI = "${env.ECR_REGISTRY}/${env.AWS_ECR_REPOSITORY}:${env.IMAGE_TAG}"
        }
      }
    }

    stage('Validate') {
      steps {
        sh 'node --check server.mjs'
        sh 'node --check script.js'
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t ${IMAGE_URI} .'
      }
    }

    stage('Push Image To ECR') {
      when {
        expression { return params.DEPLOY }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: "${AWS_CREDENTIALS_ID}"]]) {
          sh 'aws ecr describe-repositories --repository-names ${AWS_ECR_REPOSITORY} --region ${AWS_REGION} || aws ecr create-repository --repository-name ${AWS_ECR_REPOSITORY} --region ${AWS_REGION}'
          sh 'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}'
          sh 'docker push ${IMAGE_URI}'
        }
      }
    }

    stage('Deploy To ECS') {
      when {
        expression { return params.DEPLOY }
      }
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: "${AWS_CREDENTIALS_ID}"]]) {
          sh '''
            sed \
              -e "s#__TASK_FAMILY__#${AWS_ECS_TASK_FAMILY}#g" \
              -e "s#__AWS_ACCOUNT_ID__#${AWS_ACCOUNT_ID}#g" \
              -e "s#__IMAGE_URI__#${IMAGE_URI}#g" \
              -e "s#__APP_ENV__#${APP_ENV}#g" \
              -e "s#__AWS_REGION__#${AWS_REGION}#g" \
              -e "s#__DB_CLIENT__#${DB_CLIENT}#g" \
              -e "s#__DB_SSL__#${DB_SSL}#g" \
              -e "s#__DB_POOL_MAX__#${DB_POOL_MAX}#g" \
              aws/ecs-task-definition.template.json > task-definition.json

            TASK_DEF_ARN=$(aws ecs register-task-definition \
              --cli-input-json file://task-definition.json \
              --region ${AWS_REGION} \
              --query 'taskDefinition.taskDefinitionArn' \
              --output text)

            aws ecs update-service \
              --cluster ${AWS_ECS_CLUSTER} \
              --service ${AWS_ECS_SERVICE} \
              --task-definition ${TASK_DEF_ARN} \
              --region ${AWS_REGION}
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'task-definition.json', allowEmptyArchive: true
    }
  }
}
