

class BindingSitesAdapter {

    constructor(component, compObj, config, result) {
        this._component = component;
        this._compObj = compObj;
        this._config = config;
        this._result = result;

    }

    getData() {

        let present = false;
        let data = [{
            accession: this._component.id,
            locations:[{
                fragments: []
            }],
            color: this._config["color_code"][this._component.id],
            shape: "triangle"
        }];

        this._result
            .map(x => x[this._component.key])
            .reduce((a, b) => a.concat(b))
            .filter(x => (x.entity_id && x.entity_id == this._compObj._entityId))
            .forEach(site => {

                let fragment = {
                    start: site.residue_number,
                    end: site.residue_number,
                    toolTip: "Residue {resNum} ({charAtResNum}) is in binding site"
                };

                data[0].locations[0].fragments.push(fragment);
                present = true;
            });

        data[0].present = present;
        
        return data;

    }

}

export default BindingSitesAdapter;