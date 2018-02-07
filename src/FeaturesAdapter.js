

class FeaturesAdapter {

    constructor(component, compObj, config, result) {
        this._component = component;
        this._compObj = compObj;
        this._config = config;
        this._result = result;

    }

    getData() {

        if(this._result == undefined) {
            return [];
        }

        let data = [{
            accession: this._component.id,
            locations: [{
                fragments: []
            }],
            color: this._config["color_code"][this._component.id],
            present: false
        }];

        let result = this._result["molecules"];
        
        
        result.filter(x => x.entity_id == this._compObj._entityId)
            .map(x => x.chains)
            .map(x => x.filter(x => x.chain_id === this._compObj._bestChainId))
            .forEach(x => {

                x.forEach(element => {

                    if (element.secondary_structure[this._component.key] != undefined) {
                        
                        element.secondary_structure[this._component.key].forEach(structure => {
                            //console.log(structure)

                            let fragment = {
                                start: structure.start.residue_number,
                                end: structure.end.residue_number,
                                toolTip: "A " + this._component.id + " in Chain " + this._compObj._bestChainId
                            };

                            data[0].locations[0].fragments.push(fragment);
                            data[0].present = true;

                        });
                    }


                });

            });
            
        return data;

    }

}

export default FeaturesAdapter;