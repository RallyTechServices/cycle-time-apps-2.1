Ext.define('CA.technicalservices.Utility',{
    singleton: true,
    loadModels: function(modelNames, context){
        return Rally.data.ModelFactory.getModels({
            types: modelNames,
            context: context
        });
    }
});