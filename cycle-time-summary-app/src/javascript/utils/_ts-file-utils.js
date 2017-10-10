Ext.define('Rally.technicalservices.FileUtilities', {
    singleton: true,
    logger: new Rally.technicalservices.Logger(),
    saveCSVToFile:function(csv,file_name,type_object){
            if (type_object == undefined){
                type_object = {type:'text/csv;charset=utf-8'};
            }
            var blob = new Blob([csv],type_object);
            saveAs(blob,file_name);
    },
    saveTextAsFile: function(textToWrite, fileName) {
        var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
        var fileNameToSaveAs = fileName;

        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "Download File";
        if (window.webkitURL != null)
        {
            // Chrome allows the link to be clicked
            // without actually adding it to the DOM.
            downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
        }
        else
        {
            // Firefox requires the link to be added to the DOM
            // before it can be clicked.
            downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
            downloadLink.onclick = destroyClickedElement;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
        }
        downloadLink.click();
    },
    destroyClickedElement: function(event)
    {
        document.body.removeChild(event.target);
    },
    convertDataArrayToCSVText: function(data_array, requestedFieldHash){
       
        var text = '';
        Ext.each(Object.keys(requestedFieldHash), function(key){
            text += requestedFieldHash[key] + ',';
        });
        text = text.replace(/,$/,'\n');
        
        Ext.each(data_array, function(d){
            Ext.each(Object.keys(requestedFieldHash), function(key){
                if (d[key]){
                    if (typeof d[key] === 'object'){
                        if (d[key].FormattedID) {
                            text += Ext.String.format("\"{0}\",",d[key].FormattedID ); 
                        } else if (d[key].Name) {
                            text += Ext.String.format("\"{0}\",",d[key].Name );                    
                        } else if (!isNaN(Date.parse(d[key]))){
                            text += Ext.String.format("\"{0}\",",Rally.util.DateTime.formatWithDefaultDateTime(d[key]));
                        }else {
                            text += Ext.String.format("\"{0}\",",d[key].toString());
                        }
                    } else {
                        text += Ext.String.format("\"{0}\",",d[key] );                    
                    }
                } else {
                    text += ',';
                }
            },this);
            text = text.replace(/,$/,'\n');
        },this);
        return text;
    },
    _getCSVFromWsapiBackedGrid: function(grid) {
        var deferred = Ext.create('Deft.Deferred');
        var store = Ext.create('Rally.data.wsapi.Store',{
            fetch: grid.getStore().config.fetch,
            filters: grid.getStore().config.filters,
            model: grid.getStore().config.model,
            limit:Infinity,
            pageSize: Infinity

        });
        
        var columns = grid.columns;
        var headers = this._getHeadersFromGrid(grid);
        var column_names = this._getColumnNamesFromGrid(grid);
        
        var record_count = grid.getStore().getTotalCount(),
            page_size = grid.getStore().pageSize,
            pages = Math.ceil(record_count/page_size),
            promises = [];

        for (var page = 1; page <= pages; page ++ ) {
            promises.push(this.loadStorePage(grid, store, columns, page, pages));
        }
        Deft.Promise.all(promises).then({
            success: function(csvs){
                var csv = [];
                csv.push('"' + headers.join('","') + '"');
                _.each(csvs, function(c){
                    _.each(c, function(line){
                        csv.push(line);
                    });
                });
                csv = csv.join('\r\n');
                deferred.resolve(csv);
                Rally.getApp().setLoading(false);
            }
        });
        return deferred.promise;
    },

    // custom grid assumes there store is fully loaded
    _getCSVFromCustomBackedGridWithPaging: function(grid) {
        var deferred = Ext.create('Deft.Deferred');


        var store = Ext.create('Rally.data.custom.Store',{
            model: grid.getStore().config.model,
            filters: grid.getStore().config.filters,
            limit:Infinity,
            pageSize: Infinity
        });

        var columns = grid.columns;
        var headers = this._getHeadersFromGrid(grid);
        var column_names = this._getColumnNamesFromGrid(grid);
        
        var record_count = grid.getStore().getTotalCount(),
            page_size = grid.getStore().pageSize,
            pages = Math.ceil(record_count/page_size),
            promises = [];

        // for (var page = 1; page <= pages; page ++ ) {
        //     promises.push(this.loadStorePage(grid, store, columns, page, pages));
        // }

        promises.push(this.loadStorePage(grid, store, columns, page, pages));

        Deft.Promise.all(promises).then({
            success: function(csvs){
                var csv = [];
                csv.push('"' + headers.join('","') + '"');
                _.each(csvs, function(c){
                    _.each(c, function(line){
                        csv.push(line);
                    });
                });
                csv = csv.join('\r\n');
                deferred.resolve(csv);
                Rally.getApp().setLoading(false);
            }
        });
        return deferred.promise;

        // var headers = this._getHeadersFromGrid(grid);
        
        // var columns = grid.columns;
        // var column_names = this._getColumnNamesFromGrid(grid);

       
        // var csv = [];
        // csv.push('"' + headers.join('","') + '"');

        // var number_of_records = store.getTotalCount();
        
        // this.logger.log("Number of records to export:", number_of_records);
        
        // for (var i = 0; i < number_of_records; i++) {
        //     var record = store.getAt(i);
        //     if ( ! record ) {
        //         this.logger.log("Number or lines in CSV:", csv.length);
        //         return csv.join('\r\n');            }
        //     csv.push( this._getCSVFromRecord(record, grid, store) );
        // }
        
        // this.logger.log("Number or lines in CSV:", csv.length);
        // return csv.join('\r\n');
    },

    
    // custom grid assumes there store is fully loaded
    _getCSVFromCustomBackedGrid: function(grid) {
    var deferred = Ext.create('Deft.Deferred');
            var me = this;
            
            Rally.getApp().setLoading("Assembling data for export...");
            
            var headers = this._getHeadersFromGrid(grid);
            var store = Ext.clone( grid.getStore() );
            var columns = grid.columns;
            var column_names = this._getColumnNamesFromGrid(grid);
            
            var record_count = grid.getStore().getTotalCount();
            var original_page_size = grid.getStore().pageSize;
            
            var page_size = 20000;
            var number_of_pages = Math.ceil(record_count/page_size);
            store.pageSize = page_size;
            
            var pages = [],
                promises = [];

            for (var page = 1; page <= number_of_pages; page ++ ) {
                pages.push(page);
            }
            
            Ext.Array.each(pages, function(page) {
                promises.push(function() { 
                    return me._loadStorePage(grid, store, columns, page, pages.length )
                });
            });
            
            Deft.Chain.sequence(promises).then({
                success: function(csvs){

                    // set page back to last view
                    store.pageSize = original_page_size;
                    store.loadPage(1);
                    
                    var csv = [];
                    csv.push('"' + headers.join('","') + '"');
                    _.each(csvs, function(c){
                        _.each(c, function(line){
                            csv.push(line);
                        });
                    });
                    csv = csv.join('\r\n');
                    deferred.resolve(csv);
                    Rally.getApp().setLoading(false);
                }
            });
            
            return deferred.promise;
    },
    


    _loadStorePage: function(grid, store, columns, page, total_pages){
        var deferred = Ext.create('Deft.Deferred');

        store.loadPage(page, {
            callback: function (records) {
                var csv = [];
                for (var i = 0; i < records.length; i++) {
                    // if(i==0){
                    //     Rally.getApp().setLoading("Loading page "+page+ " of "+total_pages);
                    // }
                    var record = records[i];
                    csv.push( this._getCSVFromRecord(record, grid, store) );
                }
                deferred.resolve(csv);
            },
            scope: this
        });
        this.logger.log("_loadStorePage", page, " of ", total_pages);
        return deferred.promise;
    },


    _getHeadersFromGrid: function(grid) {
        var headers = [];        
        var columns = grid.columns;

        Ext.Array.each(columns,function(column){
            if ( column.dataIndex || column.renderer ) {
                if ( column.csvText ) {
                    headers.push(column.csvText.replace('&nbsp;',' '));
                } else if ( column.text )  {
                    headers.push(column.text.replace('&nbsp;',' '));
                }
            }
        });
        
        return headers;
    },
    
    _getColumnNamesFromGrid: function(grid) {
        var names = [];
        var columns = grid.columns;

        Ext.Array.each(columns,function(column){
            if ( column.dataIndex || column.renderer ) {
                names.push(column.dataIndex);
            }
        });
        
        return names;
    },
    /*
     * will render using your grid renderer.  If you want it to ignore the grid renderer, 
     * have the column set _csvIgnoreRender: true
     */
    getCSVFromGrid:function(app, grid){
        this.logger.log("Exporting grid with store type:", Ext.getClassName(grid.getStore()));
        
        if ( Ext.getClassName(grid.getStore()) != "Rally.data.custom.Store" ) {
            return this._getCSVFromWsapiBackedGrid(grid);
        }
        
        return this._getCSVFromCustomBackedGrid(grid);
    },

    loadStorePage: function(grid, store, columns, page, total_pages){
        console.log('Inside loadStorePage');
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('loadStorePage',page, total_pages);

        store.loadPage(page, {
            callback: function (records, operation, success) {
                //console.log(' page records length',records.length,'success',success);
                var csv = [];
                Rally.getApp().setLoading(Ext.String.format('Page {0} of {1} loaded',page, total_pages));
                for (var i = 0; i < records.length; i++) {
                    var record = records[i];
                    csv.push( this._getCSVFromRecord(record, grid, store) );
                }
                deferred.resolve(csv);
            },
            scope: this
        });
        return deferred;
    },
    
    _getCSVFromRecord: function(record, grid, store) {
        var mock_meta_data = {
            align: "right",
            classes: [],
            cellIndex: 9,
            column: null,
            columnIndex: 9,
            innerCls: undefined,
            recordIndex: 5,
            rowIndex: 5,
            style: "",
            tdAttr: "",
            tdCls: "x-grid-cell x-grid-td x-grid-cell-headerId-gridcolumn-1029 x-grid-cell-last x-unselectable",
            unselectableAttr: "unselectable='on'"
        };
        
        var node_values = [];
        var columns = grid.columns;
        //console.log('inside _getCSVFromRecord');
        Ext.Array.each(columns, function (column) {
            if (column.xtype != 'rallyrowactioncolumn') {
                if (column.dataIndex) {
                    var column_name = column.dataIndex;
                    
                    var display_value = record.get(column_name);

                    if (!column._csvIgnoreRender && column.renderer) {
                        if (column.exportRenderer) {
                            display_value = column.exportRenderer(display_value, mock_meta_data, record, 0, 0, store, grid.getView());
                        } else {
                            display_value = column.renderer(display_value, mock_meta_data, record, 0, 0, store, grid.getView());
                        }
                    }
                    node_values.push(display_value);
                } else {
                    var display_value = null;
                    if (!column._csvIgnoreRender && column.renderer) {
                        if (column.exportRenderer) {
                            display_value = column.exportRenderer(display_value, mock_meta_data, record, record, 0, 0, store, grid.getView());
                        } else {
                            display_value = column.renderer(display_value, mock_meta_data, record, record, 0, 0, store, grid.getView());
                        }
                        node_values.push(display_value);
                    }
                }

            }
        }, this);
        //console.log('Node values',node_values);
        return '"' + node_values.join('","') + '"';
    }

});