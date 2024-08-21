#!/bin/bash
# Check if the input argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <input_argument>"
  exit 1
fi

# Get the input argument
input_argument=$1
technology=$2
appID=$3


# Get the current timestamp in the required format (yyyyddmmhh24:mi)
timestamp=$(date +"%Y%d%m%H%M")

# Generate the filename
filename_new="${input_argument}_${timestamp}.new"
filename2="${input_argument}_${timestamp}.tar.gz"

# Create the file
echo "$appID,$filename2" >$filename_new

if [[ "$technology" == "REACT" ]]; then
    npm install
	npm run build
	tar -czf $filename2 build
	scp -o StrictHostKeyChecking=no $filename2 webteam@ajnaops:/home/webteam/inputApps
	scp -o StrictHostKeyChecking=no $filename_new webteam@ajnaops:/home/webteam/inputApps
	rm -rf $filename2 $filename_new build
elif [[ "$technology" == "NEXT" ]]; then
    npm install
	npm run build
	tar -czf $filename2 .next package.json
	scp -o StrictHostKeyChecking=no $filename2 webteam@ajnaops:/home/webteam/inputApps
	scp -o StrictHostKeyChecking=no $filename_new webteam@ajnaops:/home/webteam/inputApps
	rm -rf $filename2 $filename_new build
elif [[ "$technology" == "NODE" ]]; then
    tar -czf $filename2 .
	scp -o StrictHostKeyChecking=no $filename2 webteam@ajnaops:/home/webteam/inputApps
	scp -o StrictHostKeyChecking=no $filename_new webteam@ajnaops:/home/webteam/inputApps
	rm -rf $filename2 $filename_new build
fi