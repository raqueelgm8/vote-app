import { ChangeDetectionStrategy, Component, type OnInit } from '@angular/core';

@Component({
    selector: 'app-vote',
    imports: [],
    template: `<p>vote works!</p>`,
    styleUrl: './vote.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Vote implements OnInit {

    ngOnInit(): void { }

}
