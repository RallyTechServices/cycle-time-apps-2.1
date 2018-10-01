Ext.define('Rally.ui.LeftRight', {
    alias: 'widget.rallyleftright',
    extend: 'Ext.container.Container',

    cls: 'rui-leftright',
    defaults: {
        xtype: 'container'
    },
    items: [
        {
            itemId: 'left',
            cls: 'rly-left'
        },
        {
            itemId: 'right',
            cls: 'rly-right'
        }
    ],

    getLeft: function() {
        return this.down('#left');
    },

    getRight: function() {
        return this.down('#right');
    }
});

Ext.apply(Ext.data.SortTypes, {
    asUser: function(s) {
        if (Ext.isString(s)){
            return s;
        }
        return s && s.DisplayName || s._refObjectName;
    }
});

Ext.override(Rally.ui.grid.TreeGrid, {
    _mergeColumnConfigs: function(newColumns, oldColumns) {

        var mergedColumns= _.map(newColumns, function(newColumn) {
            var oldColumn = _.find(oldColumns, {dataIndex: this._getColumnName(newColumn)});
            if (oldColumn) {
                return this._getColumnConfigFromColumn(oldColumn);
            }

            return newColumn;
        }, this);

        mergedColumns = mergedColumns.concat(this.config.derivedColumns);
        return mergedColumns;
    },
    _getColumnConfigsBasedOnCurrentOrder: function(columnConfigs) {
        var cols = _(this.headerCt.items.getRange()).map(function(column) {
            //override:  Added additional search for column.text
            return _.contains(columnConfigs, column.dataIndex) ? column.dataIndex : _.find(columnConfigs, {xtype: column.xtype, text: column.text });
        }).compact().value();

        return cols;
    },
    _restoreColumnOrder: function(columnConfigs) {

        var currentColumns = this._getColumnConfigsBasedOnCurrentOrder(columnConfigs);
        var addedColumns = _.filter(columnConfigs, function(config) {
            if (Ext.isString(config)){
                return true;
            }
            if (!_.find(currentColumns, {dataIndex: config.dataIndex})){
                return true;
            }

            if (!_.find(currentColumns, {text: config.text})){
                    return true;
            }

            return false;
        });

        console.log('added columns', addedColumns, columnConfigs, currentColumns);

        return currentColumns.concat(addedColumns);
    },
    _applyStatefulColumns: function(columns) {
        if (this.alwaysShowDefaultColumns) {
            _.each(this.columnCfgs, function(columnCfg) {
                if (!_.any(columns, {dataIndex: this._getColumnName(columnCfg)})) {
                    columns.push(columnCfg);
                }
            }, this);
        }

        if (this.config && this.config.derivedColumns){
            this.columnCfgs = columns.concat(this.config.derivedColumns);
        } else {
            this.columnCfgs = columns;
        }

    }
});

Ext.override(Ext.form.RadioGroup, {
   getState: function() {
       var state = this.callParent(arguments) || {};
       return _.merge(state, this.getValue());
   },

   applyState: function(state) {
       this.callParent(arguments);
       this.setValue(state);
   }
});

