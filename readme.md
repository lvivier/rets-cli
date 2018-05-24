
# rets-cli

Command line RETS client. Uses [rets.js](https://github.com/retsr/rets.js).

## Install

Install globally with npm:

```
$ npm install -g rets-cli
```

## Usage

```
$ rets --help

  Usage: rets [options]

  Options:

    -V, --version                output the version number
    --url <url>                  RETS login URL
    -r --search-type <resource>  SearchType
    -c --class <class>           Class
    -q --query <query>           DMQL Query
    -l --limit <limit>           Limit (default: 10)
    -o --offset <offset>         Offset
    --select <fields>            Select
    --debug                      Debug mode
    --dry-run                    Print query and exit
    --format [csv|json|json2]    Output format (default: json2)
    -h, --help                   output usage information
```
