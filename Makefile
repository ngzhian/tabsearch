all: build

clean:
	rm -rf build/

build: manifest.json
	mkdir -p build
	zip -r build/tabsearch.zip . -x *.git* Makefile *.swp .DS_Store
