# Wait for couchDB to start
couchdb -b > couch.log &

echo "Waiting for CouchDB to initialize. using a sleep. Definitely someone can improve this code";

sleep 5;
