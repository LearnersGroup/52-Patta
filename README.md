# to boot up AWS instance
1. [go to AWS backend instance](https://us-east-2.console.aws.amazon.com/ec2/home?region=us-east-2#InstanceDetails:instanceId=i-0289b30cce6f2c7b8)
2. Start instance (if not already started) and connect to instance.
3. cd `/action-runner`
4. `sudo ./svc.sh start`

# Notes
1. Backend IP changes everytime, so we need to point front-end to use new endpoint everytime, through secrets.
   [Edit secrets here](https://github.com/LearnersGroup/52-Patta/settings/secrets/actions)
