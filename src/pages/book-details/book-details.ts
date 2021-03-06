import {Component} from '@angular/core';
import {IonicPage, ModalController, NavController, NavParams, ToastController} from 'ionic-angular';
import {Book, FreightLabels} from "../../models/book";
import {UserService} from "../../services/user/user.service";
import {PhotoViewer} from "@ionic-native/photo-viewer";
import {BookService} from "../../services/book/book.service";
import {SessionService} from '../../services/session/session.service';
import {User} from '../../models/user';
import "rxjs/add/operator/timeout";

@IonicPage({
  defaultHistory: ['HomePage']
})
@Component({
  selector: 'page-book-details',
  templateUrl: 'book-details.html',
})
export class BookDetailsPage {
  book: Book;
  alreadyRequested: boolean;
  freightLabels = FreightLabels;
  chooseDateInfo: string;
  isFreeFreight: boolean;
  user: User;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public userService: UserService,
    public photoViewer: PhotoViewer,
    public modalCtrl: ModalController,
    public toastCtrl: ToastController,
    public bookService: BookService,
    public sessionService: SessionService,
  ) {
    this.book = this.navParams.get('book');
  }

  ionViewCanEnter() {
    return !!this.book;
  }

  ionViewWillEnter() {
    this.verifyIfRequested();
  }

  ionViewDidLoad() {
    this.loadUser();
    this.verifyAddress();
  }

  loadUser() {
    this.userService.getUserData().timeout(15000).subscribe(user => {
      this.user = user;
      this.calculateIsFreeFreight();
    }, err => {
      
    })
  }


  calculateIsFreeFreight() {
    if (this.book.user.address && this.user.address) {
      switch (this.book.freightOption.toString()) {
        case 'City':
          this.isFreeFreight = this.book.user.address.city === this.user.address.city;
          break;
        case 'State':
          this.isFreeFreight = this.book.user.address.state === this.user.address.state
          break;
        case 'WithoutFreight':
          this.isFreeFreight = false;
          break;
        default:
          this.isFreeFreight = true;
      }
    }
  }

  verifyIfRequested() {
    this.bookService.getRequested(this.book.id).subscribe(resp => {
      this.alreadyRequested = resp.value && resp.value.bookRequested;

      if (this.alreadyRequested) {
        this.calculateChoosingDate();
      }
    }, err => {

    })
  }

  verifyAddress() {
    const { address } = this.book.user;

    if (address) {
      if (!address.city && address.postalCode) {
        this.getCity(address.postalCode);
      }
    } else {
      this.book.user.address = {};
    }
  }

  getCity(cep) {
    this.userService.consultarCEP(cep).subscribe(address => {
      const {localidade, uf} = <any>address;
      if (localidade && uf) {
        this.book.user.address.city = localidade;
        this.book.user.address.state = uf;
      }
    }, err => {

    })
  }

  openBookCover() {
    this.photoViewer.show(this.book.imageUrl);
  }

  openBookRequest() {
    const bookModal = this.modalCtrl.create('BookRequestPage', {
      book: this.book
    });

    const addressModal = this.modalCtrl.create('ConfirmAddressPage');

    bookModal.onDidDismiss((data) => {
      if (data && data.success) {
        addressModal.present();
        this.verifyIfRequested();
      }
    });

    addressModal.onDidDismiss((data) => {
      if (!(data && data.preventToast)) {
        this.toastCtrl.create({
          message: 'Livro solicitado com sucesso!',
          cssClass: 'toast-success',
          duration: 3000,
        }).present();
      }
    });

    bookModal.present();
  }

  calculateChoosingDate() {
    if (!this.book.chooseDate) return;
    const chooseDate = Math.floor(new Date(this.book.chooseDate).getTime() / (3600 * 24 * 1000));
    const todayDate   = Math.floor(new Date().getTime() / (3600 * 24 * 1000));

    const daysToChoose = chooseDate - todayDate;
    this.chooseDateInfo = daysToChoose <= 0 ? 'Hoje' : 'Daqui a ' + daysToChoose + ' dia(s)';
  }
}
