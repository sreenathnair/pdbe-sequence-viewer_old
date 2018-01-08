import * as d3 from "d3";

class PDBeSequenceViewer extends HTMLElement {

  constructor() {
    super();
    this._components = this.getAttribute("components");
    this._pdbid = this.getAttribute("pdbid");


  }

  connectedCallback() {

    console.log('Loaded PDB sequence viewer');
    console.log("Required components => " +this._components);
    console.log("PDBID => " +this._pdbid);

    //reading configuration
    d3.json("pdbe-sequence-viewer/config/config.json", config => {

      console.log("Config => ", config);
      var dataService = new DataService();
      var compObj = this;

      // api to get outlier ratio to get best chain id
      var ratioPromiseList = dataService.createPromise([this._pdbid], ['observedResidueRatio']);

      ratioPromiseList.forEach(ratioPromise => {

        ratioPromise.then(function (ratioResult) {
            
            var bestEntry = ratioResult[compObj._pdbid][1][0];
            compObj._bestChainId = bestEntry.chain_id;
            compObj._bestStructAsymId = bestEntry.struct_asym_id;
            compObj._pdbSequenceLength = bestEntry.number_residues;
            compObj._displaystart = 1;
            compObj._displayend = compObj._pdbSequenceLength;

            compObj.paintBasicLayout(compObj);

            //console.log(config['component'])

            // creating list of promises required for requested components
            var promiseList = [];
            var apiList = [];

            compObj._components.split(',').forEach(component => {
              let tempList = config['service'][component];
              apiList.push(tempList)
            });

            // flattening promise list
            apiList = compObj.flattenArray(apiList);

            // making a unique list
            apiList = compObj.uniqueArray(apiList);

            console.log(apiList);

            promiseList = dataService.createPromise([compObj._pdbid], apiList, compObj._bestChainId, compObj._bestStructAsymId);

            dataService.combineData(promiseList, compObj._pdbid, apiList).then(function (combinedResult) {

              console.log(combinedResult)

              // paint molecule component by default
              if (combinedResult[compObj._pdbid]['entities']['resolve']) {
                combinedResult[compObj._pdbid]['entities']['result'][compObj._pdbid].forEach(element => {
                    
                  if (element.entity_id && element.entity_id == 1) {
                        compObj._pdbSequence = element.pdb_sequence;
                        document.querySelector('#top-sequence').data = compObj._pdbSequence;

                        let moleculeData = [{
                          accession: "molecule",
                          start: 1,
                          end: compObj._pdbSequence.length,
                          color: config["color_code"]["molecule"]
                      }];

                      document.querySelector('#molecule-track').data = moleculeData;

                      var residue = new Residue(1);
                      console.log(residue.res_number);
                  }

                });
              }

            });

          },
          function(error) {
            console.log('Error loading API data');
            console.log(error);
            window.alert('Error downloading API data, please check the parameters');
          }
        );
      });

    });


  }


  static get observedAttributes() {
    return [];
  }

  attributeChangedCallback(name, oldValue, newValue) {

  }

  paintBasicLayout(compObj) {

    this.mainContent = d3.select(this)
        .append('div')
        .attr('class', 'main-content');

      this.navDiv = this.mainContent.append('div')
        .attr('id', 'nav-div');

      this.navDiv.append('div')
        .attr('class', 'left');

      this.navComponent = d3.select(document.createElement('protvista-navigation'));
      this.navComponent.attr('class', 'right')
        .attr('length', compObj._pdbSequenceLength)
        .attr('displaystart', compObj._displaystart)
        .attr('displayend', compObj._displayend)
        .attr('highlightstart', '')
        .attr('highlightend', '');

      this.navDiv.node().append(this.navComponent.node());


      this.topSeqDiv = this.mainContent.append('div')
        .attr('id', 'top-seq-div');

      this.topSeqDiv.append('div')
        .attr('class', 'left');

      this.topSeqDiv.append('protvista-sequence')
        .attr('class', 'right')
        .attr('id', 'top-sequence')
        .attr('length', compObj._pdbSequenceLength)
        .attr('displaystart', compObj._displaystart)
        .attr('displayend', compObj._displayend);

      this.moleculeDiv = this.mainContent.append('div')
        .attr('id', 'molecule-div');

      this.moleculeDiv.append('div')
        .attr('class', 'left')
        .text('Molecule');

      this.moleculeDiv.append('protvista-track')
        .attr('id', 'molecule-track')
        .attr('class', 'right')
        .attr('length', compObj._pdbSequenceLength)
        .attr('displaystart', compObj._displaystart)
        .attr('displayend', compObj._displayend);

  }

  uniqueArray(arrArg) {
    return arrArg.filter((elem, pos, arr) => {
      return arr.indexOf(elem) == pos;
    });
  }

  flattenArray(arrArg) {
    return arrArg.reduce((a, b) => a.concat(b));
  }

}

export default PDBeSequenceViewer;

class Residue {
  constructor(res_number) {
    this.res_number = res_number;
  }
}