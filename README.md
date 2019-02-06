# aws_connect_sugar_crm_integration

These are lambads that the Amazon Connect flow talk to. These lambda functions call SugarCRM's API and help integrate the incoming phone call by:
- show who is calling (with link to their record in SugarCRM)
- show call record so they can make notes about call (which is attached to incoming caller's record in SugarCRM)
- record the phone call and put the link in the above call record


![flow](https://d33pe1gs12zopv.cloudfront.net/flow.png)
