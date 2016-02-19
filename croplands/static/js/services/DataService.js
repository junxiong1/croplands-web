app.factory('DataService', ['mappings', '$http', '$rootScope', '$q', '$timeout', 'log', 'User', function (mappings, $http, $rootScope, $q, $timeout, log, User) {
    var _baseUrl = 'https://api.croplands.org',
        data = {
            records: [],
            count: {},
            columns: angular.copy(mappings),
            ordering: {},
            paging: {
                page: 1,
                page_size: 200
            },
            busy: false,
            is_initialized: false
        };

    function select(choices, value) {
        _.each(choices, function (option) {
            option.selected = value;
        });
    }

    function getParams() {
        var filters = {};
        _.each(data.columns, function (column, key) {
            var values = [];
            _.each(column.choices, function (option) {
                if (option.selected) {
                    values.push(option.id);
                }
            });

            filters[key] = values;
        });

        return _.assign(filters, data.ordering, data.paging);
    }

    function csvToJSON(csv, types) {
        var lines = csv.split("\n"),
            headers = lines[0].split(','),
            results;

        results = _.map(lines.slice(1, lines.length - 1), function (l) {
            var row = {};
            _.each(l.split(','), function (col, i) {
                var value = col;
                if (types && types[headers[i]]) {
                    value = types[headers[i]](col);
                }

                row[headers[i]] = value;
            });
            return row;
        });
        return results;
    }

    data.setDefault = function () {
        select(data.columns.land_use_type, true);
        select(data.columns.crop_primary, true);
        select(data.columns.water, true);
        select(data.columns.intensity, true);
        select(data.columns.year, true);
        select(data.columns.source_type, true);
    };

    data.reset = function () {
        log.info("[DataService] Reset");
        data.setDefault();
        data.load();
    };

    // load data from server
    data.load = function () {
        log.info("[DataService] Load");
        var deferred = $q.defer();
        data.busy = true;
        data.is_initialized = true;

        $http({
            url: _baseUrl + '/data/search',
            method: "GET",
            params: getParams()
        }).then(function (response) {
            data.records = csvToJSON(response.data, {
                id: parseInt,
                month: parseInt,
                year: parseInt,
                lat: parseFloat,
                lon: parseFloat,
                crop_primary: parseInt,
                crop_secondary: parseInt,
                water: parseInt,
                intensity: parseInt,
                land_use_type: parseInt
            });

            var headers = response.headers();
            data.count.total = headers['query-count-total'];
            data.count.filtered = headers['query-count-filtered'];
            console.log(data.count);
            deferred.resolve(response);
            $rootScope.$broadcast("DataService.load", data.records);
            data.busy = false;
        }, function (e) {
            deferred.reject(e);
        });

        return deferred.promise;
    };

    data.init = function () {
        log.info("[DataService] Init");
        if (!data.is_initialized) {
            data.setDefault();
            data.load();
            data.is_initialized = true;
        }
    };

    data.init();

    return data;
}]);
