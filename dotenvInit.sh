#!/bin/bash

file="ADMIN_TOKEN=$ADMIN_TOKEN\nCOMPANY_ID=$COMPANY_ID\nCHATBOT_ID=$CHATBOT_ID\nUSER_ID=$USER_ID\nHOST=$HOST"

printf $file > ./lib/reporters/.env