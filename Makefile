SHELL := /bin/bash

commit:
	git commit -m "🍻 Updated at `date`"

pull:
	git remote add origin git@github.com:leduong/EPlusTV.git
	git pull origin mbl
	git remote remove origin

push:
	git remote add origin git@github.com:leduong/EPlusTV.git
	git push --set-upstream origin mbl
	git remote remove origin

up:
	docker compose up -d

down:
	docker compose down

deploy:
	docker compose up -d --build

logs:
	docker compose logs -f
